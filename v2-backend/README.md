# Decent Portfolio v2 — Backend

A peer-to-peer crypto portfolio tracker using OrbitDB on Helia (modern IPFS).

## Stack

- **OrbitDB** (`@orbitdb/core` v2.x) — distributed document store on top of IPFS
- **Helia** (`helia` v5.x) — modern JavaScript IPFS implementation (replaces deprecated `js-ipfs`)
- **libp2p** v2.x — peer-to-peer networking layer
- **Express** — HTTP API the Vercel frontend talks to
- **CoinGecko** — price feed (free tier, polled every 10s, cached server-side)

## Why this exists

v1 worked but used `orbit-db` and `js-ipfs`, both of which were superseded by the OrbitDB team's migration to Helia. v2 is a clean rewrite against the modern stack with multi-asset support (BTC, ZEC, SOL, ETH), real position aggregation across multiple BUY/SELL transactions, and live PnL.

## Routes

| Method | Path                  | Notes                                            |
|--------|-----------------------|--------------------------------------------------|
| GET    | `/api/health`         | DB address + supported assets                    |
| GET    | `/api/prices`         | Current USD prices (cached 10s)                  |
| POST   | `/api/add-entry`      | Add BUY/SELL transaction                         |
| GET    | `/api/entries`        | All transactions (every user)                    |
| GET    | `/api/query/id?id=…`  | Transactions for a specific user (v1-compat)     |
| GET    | `/api/positions?id=…` | Computed positions w/ live PnL for a user        |

## Running locally

```bash
npm install
npm start          # listens on :3001
```

Data persists under `./data/` (OrbitDB + Helia blockstore + libp2p datastore).

## Deployment

Runs as a systemd service on the same Ubuntu host as v1, on port 3001. The Cloudflare Tunnel ingress is updated to point `orbitdb-servermckurz.com` at port 3001 once v2 is verified.

## Future work

- Browser-side Helia peer (Vercel frontend joins the IPFS swarm directly instead of going through Express)
- WebSocket price feed (Binance) for sub-second updates
- Wallet-based auth (sign-in with Ethereum/Solana)
- Historical portfolio value charts
- Transaction edit/delete
