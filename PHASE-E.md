# Phase E: LLM insight layer

## Overview and thesis

Phase E adds an "AI Analyst" surface to Decent Portfolio: a component in the UI where the user can request natural-language analysis of their portfolio, and receive a paragraph of reasoning based on their positions, recent price action, and (optionally) linked Hyperliquid perps positions.

This does not change the data model, storage layer, or user auth. The insight layer is strictly additive.

### Why it fits the project

Decent Portfolio's stated model is self-sovereign: portfolio data lives in encrypted OrbitDB, replicated peer-to-peer, and the operator controls the infrastructure. Adding a centralized LLM would introduce tension with that model.

The resolution: portfolio data never leaves OrbitDB. Only an ephemeral, per-request "context bundle" — a JSON object assembled by the backend for one insight request — is sent to the reasoning layer. The bundle contains position summaries and market context, not raw oplog entries or identity material. The reasoning layer sees enough to reason but not the source of truth.

### Model choice

The reasoning layer targets Claude Sonnet 5 via the Anthropic API. See "Reasoning module" for the abstraction that keeps model choice isolated.

## Architecture

Three layers, cleanly separated:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                     │
│  - <PortfolioInsight/> component                        │
│  - Calls backend POST /api/insight                      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────┐
│  Backend (Express)                                      │
│                                                         │
│  1. Context layer   (lib/contextBundle.js)              │
│     - Reads positions from OrbitDB                      │
│     - Fetches prices from prices.js                     │
│     - Fetches Hyperliquid Info (optional)               │
│     - Assembles JSON bundle                             │
│                                                         │
│  2. Reasoning layer (lib/reasoning.js)                  │
│     - Loads prompt template from prompts/insight-v1.md  │
│     - Calls Claude Sonnet 5 via @anthropic-ai/sdk       │
│     - Returns { text, model, tokens }                   │
│                                                         │
│  3. Response formatter                                  │
│     - Returns { insight, generatedAt, model } to client │
└─────────────────────────────────────────────────────────┘
```

The context layer is the reusable seam. It exposes structured portfolio state that any downstream component (LLM, notification worker, future execution agent) can consume.

The reasoning layer is the model-swappable seam. Every Claude SDK call is inside `reasoning.js`. Nothing else in the codebase imports the SDK.

## Context bundle spec

The context bundle is the JSON object passed from the context layer to the reasoning layer. Its shape is versioned so we can evolve it deliberately.

```json
{
  "bundleVersion": "1.0",
  "generatedAt": "2026-07-07T20:15:00.000Z",
  "userId": "island",
  "portfolio": {
    "positions": [
      {
        "asset": "ZEC",
        "quantity": 3.0173,
        "avgCost": 392.36,
        "costBasis": 1183.87,
        "spot": 492.14,
        "marketValue": 1485.31,
        "unrealizedPnl": 301.44,
        "unrealizedPnlPct": 25.46,
        "change24hPct": 9.27
      }
    ],
    "totals": {
      "costBasis": 1183.87,
      "marketValue": 1485.31,
      "unrealizedPnl": 301.44,
      "unrealizedPnlPct": 25.46
    },
    "positionCount": 1
  },
  "hyperliquid": null,
  "marketContext": {
    "assetsCovered": ["ZEC"],
    "priceSource": "prices.js",
    "priceAgeSeconds": 27
  }
}
```

Notes on shape:

- `bundleVersion` is a string, bumped when the shape changes in a way the prompt would need to know about
- `userId` is included so the prompt can address the user's portfolio directly; it does not identify the user beyond what the app already exposes
- `hyperliquid` is `null` when the user has not linked a Hyperliquid address; when present, it follows the shape in the Hyperliquid integration section below
- No raw OrbitDB CIDs, oplog entries, keys, or identity material are included

## Data flow

Sequence of a single insight request:

1. **User clicks the "Analyze Portfolio" button** in the frontend `<PortfolioInsight/>` component
2. **Frontend fires** `POST /api/insight` with body `{ userId: "island" }`
3. **Backend receives request**, validates origin against `ALLOWED_ORIGINS`, applies rate limit
4. **Context layer runs** `assembleContextBundle(userId)`:
   - `computePositions()` on the current OrbitDB state (existing code path)
   - `getPrices()` for the assets in the portfolio (existing code path)
   - If a Hyperliquid address is configured for the user, fetch Info API data
   - Assemble the bundle JSON
5. **Reasoning layer runs** `getInsight(bundle)`:
   - Loads `prompts/insight-v1.md` if not already cached
   - Builds the messages array: system prompt + user turn containing the bundle as JSON
   - Calls Claude Sonnet 5 via `@anthropic-ai/sdk`
   - Returns `{ text, model, promptTokens, completionTokens }`
6. **Response formatter** returns:
```json
   {
     "insight": "Your portfolio is 100% concentrated in ZEC...",
     "generatedAt": "2026-07-07T20:15:03.482Z",
     "model": "claude-sonnet-5",
     "bundleVersion": "1.0"
   }
```
7. **Frontend renders** the insight text in the `<PortfolioInsight/>` component

Total latency budget: ~3-5 seconds end-to-end for a small portfolio. Sonnet 5 typical response time dominates.

## API surface

### `POST /api/insight`

Generate a natural-language insight for a user's portfolio.

**Request:**
```json
{ "userId": "island" }
```

**Response 200:**
```json
{
  "insight": "...",
  "generatedAt": "2026-07-07T20:15:03.482Z",
  "model": "claude-sonnet-5",
  "bundleVersion": "1.0"
}
```

**Response 400** — invalid/missing userId

**Response 429** — rate limit exceeded (uses existing `rateLimit` middleware)

**Response 502** — upstream reasoning error (Anthropic API failure, timeout)

**Response 503** — context assembly failed (OrbitDB unreachable, prices stale)

### Rate limiting

Insight calls are more expensive than reads. Apply a stricter limit than `/api/positions`:

- 5 requests per minute per IP
- 50 requests per day per userId

Rate limit configuration lives with the existing rate-limit module.

## Reasoning module

The public interface of `lib/reasoning.js`:

```javascript
// lib/reasoning.js

/**
 * Generate an insight from a context bundle.
 * @param {object} bundle - Context bundle (see contextBundle.js)
 * @returns {Promise<{text: string, model: string, promptTokens: number, completionTokens: number}>}
 * @throws {ReasoningError} - Wraps upstream errors with a stable error shape
 */
export async function getInsight(bundle) { ... }

/**
 * Health check — verifies API key and reachability.
 * Used at startup to fail fast on missing/invalid credentials.
 */
export async function checkReasoningHealth() { ... }
```

### Model-swap discipline

`reasoning.js` is the only file that imports `@anthropic-ai/sdk`. Any future swap to a local model or a different API means editing this one file. Downstream callers only depend on the `getInsight` signature.

### Timeout and error behavior

- Anthropic API call is wrapped in `AbortController` with a 30-second timeout
- On timeout: throws `ReasoningError { code: 'TIMEOUT' }`
- On API error: throws `ReasoningError { code: 'UPSTREAM', status, message }`
- On missing/invalid API key: `checkReasoningHealth()` fails at startup and the `/api/insight` endpoint returns 503 until fixed

### Environment variables

- `ANTHROPIC_API_KEY` — required secret, no default
- `REASONING_MODEL` — defaults to `claude-sonnet-5`, overridable for experimentation
- `REASONING_MAX_TOKENS` — defaults to 1024, bounds the output length
- `REASONING_TIMEOUT_MS` — defaults to 30000

## Prompt template v1

Lives at `~/decent-portfolio/v2-backend/prompts/insight-v1.md`. Loaded once at startup, cached in module scope.

Rough content (this is a starting point, expect iteration):

```
You are the AI analyst for Decent Portfolio, a peer-to-peer crypto portfolio
tracker. You receive a JSON context bundle describing a user's portfolio and
market context. Produce a concise, honest analysis (2-3 short paragraphs, no
bullet points, no headers) that:

- Summarizes the portfolio's composition and current state
- Notes concentration risk or diversification observations
- Flags any position that stands out (large unrealized loss, unusual 24h move,
  significant Hyperliquid exposure)
- Is candid: if the portfolio is small or one-asset, say so rather than
  padding

Do not:
- Give trading advice or price predictions
- Recommend specific buys, sells, or allocations
- Speculate about future market direction
- Invent metrics or positions not in the bundle

Format: plain prose. No markdown headers. No bulleted lists. Address the user
in second person ("your portfolio...").

Here is the context bundle:

{{BUNDLE_JSON}}
```

The `{{BUNDLE_JSON}}` placeholder is replaced at call time with `JSON.stringify(bundle, null, 2)`.

## Frontend surface

New component: `~/decent-portfolio/v2-frontend/components/PortfolioInsight.tsx`

### Behavior

- Renders below the Positions section
- Displays a button: "Analyze Portfolio"
- On click: sets loading state, fires `POST /api/insight`, renders response
- Loading state: spinner + text ("Analyzing...")
- Error state: red text with the error message and a retry button
- Success state: renders the insight text in a card

### States

```
Initial:     [Analyze Portfolio button]
Loading:     [Spinner] "Analyzing your portfolio..."
Success:     [Insight text card] [Regenerate button]
Error:       [Error message] [Retry button]
```

### Caching

Insights are not persisted client-side. Each click generates a fresh insight. This is intentional — insights are point-in-time observations and shouldn't be treated as authoritative saved records.

### Copy

The button label and error copy live in the component. Suggested initial copy:

- Button: "Analyze Portfolio"
- Loading: "Analyzing your portfolio..."
- Error (generic): "Couldn't generate an insight right now. Try again in a moment."
- Error (rate limit): "You've reached the analysis limit. Try again in a minute."
- Disclaimer under insight card: "Generated by Claude Sonnet 5. Not financial advice."

## Hyperliquid integration

Optional. When a user has a Hyperliquid address configured, the context bundle includes their public perps data via the Hyperliquid Info API.

### Configuration

- Frontend adds a "Hyperliquid Address" field to user settings (or query param)
- Backend accepts `hyperliquidAddress` optionally in the request body
- No private keys, no signing — pure read-only public data

### Info API endpoints used (Phase E scope)

- `POST https://api.hyperliquid.xyz/info` with `{ "type": "clearinghouseState", "user": "0x..." }`
  - Returns account value, margin usage, open perps positions

### Bundle shape when hyperliquid is present

```json
"hyperliquid": {
  "address": "0x...",
  "accountValue": 12500.00,
  "totalMarginUsed": 3200.00,
  "positions": [
    {
      "coin": "ETH",
      "size": 2.5,
      "entryPrice": 3100.00,
      "unrealizedPnl": 145.20,
      "leverage": 5
    }
  ]
}
```

### Failure mode

If the Hyperliquid Info API call fails or times out (2-second timeout), `hyperliquid` is `null` in the bundle and the prompt is unaffected. Failed Hyperliquid fetch never blocks the insight.

## Decomposition into buildable chunks

Chunks are ordered so each one leaves the system in a working state. Chunks can be shipped incrementally — the app is functional at every chunk boundary.

### Chunk 1: Context layer skeleton
- Create `lib/contextBundle.js` with `assembleContextBundle(userId)`
- Assembles bundle from OrbitDB + prices, no Hyperliquid yet
- Add unit test: given a mock userId, returns a well-formed bundle
- Exit criteria: `assembleContextBundle("island")` returns valid JSON matching the spec

### Chunk 2: Reasoning module
- Install `@anthropic-ai/sdk`
- Create `lib/reasoning.js` with `getInsight(bundle)`
- Create `prompts/insight-v1.md`
- Add `ANTHROPIC_API_KEY` handling (env, startup validation via `checkReasoningHealth()`)
- Add unit test: given a fixture bundle, returns non-empty insight text
- Exit criteria: manual test — pass a hand-built bundle to `getInsight`, get a sensible paragraph back

### Chunk 3: Backend endpoint
- Add `POST /api/insight` to `server.js`
- Wire context assembly + reasoning + response format
- Add rate limiting
- Add error paths (400/429/502/503)
- Exit criteria: `curl` to the endpoint returns valid insight JSON

### Chunk 4: Frontend component
- Create `components/PortfolioInsight.tsx`
- Wire button → POST → render response
- Handle loading/error/success states
- Add to main page below Positions section
- Exit criteria: click button on local dev, see insight rendered

### Chunk 5: Hyperliquid integration
- Add Hyperliquid Info API fetch to context layer
- Add address field to frontend
- Test with a real Hyperliquid address
- Exit criteria: bundle includes real hyperliquid data when address is set

### Chunk 6: Polish and ship
- Refine prompt template based on 10-20 real insight examples
- Update README with the new capability
- Deploy to Vercel
- Exit criteria: production URL shows the working feature

## Non-goals

Explicitly out of scope for Phase E:

- **Trading execution.** No orders placed. No signing. Read-only insight only.
- **Cross-venue reasoning.** Solana ↔ Hyperliquid basis analysis is Phase F territory.
- **Local model inference.** Sonnet 5 via API only. The abstraction supports it, but implementation is deferred.
- **Insight persistence.** Insights are ephemeral. Not saved to OrbitDB, not cached client-side.
- **Multi-turn chat.** One request in, one insight out. No conversational context.
- **Insight streaming.** Wait for the full response, render at once. Streaming is a UX improvement, not a Phase E requirement.
- **Alerting or notifications.** No push, no email, no webhooks.
- **User-configurable prompts.** The prompt is authored by the operator, not the user. This is a deliberate liability boundary: users cannot manipulate the prompt to elicit specific advice.

## Open questions

Deferred to implementation. Not blocking spec approval.

1. **How does the user configure their Hyperliquid address?** Query param, localStorage, OrbitDB user record? Chunk 5 decides.
2. **Do we want a "regenerate" button or make the primary button also work as regenerate?** Chunk 4 decides based on how it feels.
3. **Should the insight text include a timestamp of when the underlying prices were fetched?** Probably yes, small addition to the response.
4. **Rate limit tuning.** Starting values (5/min/IP, 50/day/user) may be too tight or too loose. Adjust after real traffic.
5. **Prompt caching.** The system prompt is static and could benefit from Anthropic's prompt caching (90% discount on cached input). Worth exploring in Chunk 2 or as a Phase E.1 optimization.