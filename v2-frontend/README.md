# Decent Portfolio v2 — Frontend

Next.js 16 + React 19 + TypeScript + Tailwind CSS. Speaks to the v2 backend over HTTP through the Cloudflare Tunnel.

## Features

- Multi-asset tracking (BTC, ZEC, SOL, ETH)
- Live price ticker (polled every 10s)
- Aggregated positions with weighted-average cost basis
- Live unrealized PnL ($ and %) per position and portfolio-wide
- Form-based transaction entry with client-side validation
- Multiple users supported via a User ID field (persisted in localStorage)

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript** in strict mode
- **Tailwind CSS** for styling

## Running locally

```bash
cp .env.local.example .env.local
# edit if your backend isn't on http://localhost:3001

npm install
npm run dev
```

Visit http://localhost:3000.

## Deployment

Deployed to Vercel. The Vercel project's `NEXT_PUBLIC_API_BASE` environment variable points at `https://orbitdb-servermckurz.com`, which routes through Cloudflare Tunnel to the v2 backend on port 3001.

## Project structure

```
app/                  # Next.js App Router pages and layouts
components/           # React components (presentational + form)
hooks/                # usePrices, usePositions
lib/                  # api client, types, formatters
```

## Future work

- Wallet-based auth (sign-in with Ethereum or Solana)
- Browser-side Helia peer (frontend joins the IPFS swarm directly)
- WebSocket price feed for sub-second updates
- Historical portfolio value chart
- Transaction edit/delete UI
