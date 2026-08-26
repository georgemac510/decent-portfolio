// Hyperliquid Info API client.
// Public read-only calls; no auth. Fetches perps account state for a given address.
// See: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const FETCH_TIMEOUT_MS = 2000;

/**
 * Fetch clearinghouseState for a Hyperliquid perps account.
 *
 * Returns a normalized object matching PHASE-E.md § "Hyperliquid integration",
 * or null if the address is empty, the fetch fails, or the response is malformed.
 * Null return is not treated as an error — the insight proceeds without perps context.
 *
 * @param {string} address - EVM address (0x...)
 * @returns {Promise<object|null>}
 */
export async function fetchHyperliquidState(address) {
  if (!address || typeof address !== 'string') return null;
  const normalized = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clearinghouseState', user: normalized }),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const raw = await res.json();
    return normalizeState(normalized, raw);
  } catch (err) {
    // Timeout, network error, JSON parse error — all treated as "no data".
    console.warn('[hyperliquid] fetch failed:', err.message || err.name);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Shape the raw Hyperliquid response to match our context bundle spec.
 * Returns null if the raw data is missing required structure.
 */
function normalizeState(address, raw) {
  if (!raw || typeof raw !== 'object') return null;

  const summary = raw.marginSummary || {};
  const accountValue = Number(summary.accountValue ?? 0);
  const totalMarginUsed = Number(summary.totalMarginUsed ?? 0);

  const positions = Array.isArray(raw.assetPositions)
    ? raw.assetPositions
        .map((p) => {
          const pos = p?.position || {};
          const size = Number(pos.szi ?? 0);
          if (!Number.isFinite(size) || size === 0) return null;
          return {
            coin: pos.coin || 'UNKNOWN',
            size,
            entryPrice: Number(pos.entryPx ?? 0),
            unrealizedPnl: Number(pos.unrealizedPnl ?? 0),
            leverage: Number(pos.leverage?.value ?? 0),
          };
        })
        .filter(Boolean)
    : [];

  return {
    address,
    accountValue,
    totalMarginUsed,
    positions,
  };
}