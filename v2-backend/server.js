// Decent Portfolio v2 — Express API on top of OrbitDB.
//
// Routes:
//   GET  /api/health           — liveness check
//   GET  /api/prices           — current USD prices for BTC/ZEC/SOL/ETH
//   POST /api/add-entry        — add a transaction (BUY/SELL)
//   GET  /api/entries          — all transactions
//   GET  /api/query/id?id=…    — transactions for a specific user id
//   GET  /api/positions?id=…   — computed positions w/ live PnL for a user
//
// Listens on PORT (default 3001) so v1 on 3000 keeps running unchanged.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initOrbitDB } from './orbitdb.js';
import { getPrices, SUPPORTED_ASSETS } from './prices.js';

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  const { db } = await initOrbitDB();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // -- Health -----------------------------------------------------------
  app.get('/api/health', async (req, res) => {
    res.json({
      status: 'ok',
      version: '2.0.0',
      dbAddress: db.address.toString(),
      supportedAssets: SUPPORTED_ASSETS,
    });
  });

  // -- Prices -----------------------------------------------------------
  app.get('/api/prices', async (req, res) => {
    try {
      const prices = await getPrices();
      res.json(prices);
    } catch (err) {
      res.status(502).json({ error: 'price feed unavailable' });
    }
  });

  // -- Add transaction --------------------------------------------------
  app.post('/api/add-entry', async (req, res) => {
    const entry = req.body;

    // Basic validation. The frontend should also validate, but never trust it.
    const required = ['_id', 'asset', 'trade', 'quantity', 'price', 'date'];
    for (const field of required) {
      if (entry[field] === undefined || entry[field] === '') {
        return res.status(400).json({ error: `missing field: ${field}` });
      }
    }
    const asset = String(entry.asset).toUpperCase();
    if (!SUPPORTED_ASSETS.includes(asset)) {
      return res.status(400).json({
        error: `asset must be one of ${SUPPORTED_ASSETS.join(', ')}`,
      });
    }
    const trade = String(entry.trade).toUpperCase();
    if (!['BUY', 'SELL'].includes(trade)) {
      return res.status(400).json({ error: 'trade must be BUY or SELL' });
    }
    const quantity = Number(entry.quantity);
    const price = Number(entry.price);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive number' });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'price must be a positive number' });
    }

    // Compose a per-transaction id so multiple BUY entries by the same user
    // for the same asset don't collide. v1 used `_id` as the user id, which
    // meant only one row per user could exist at a time.
    const txId = `${entry._id}:${asset}:${Date.now()}`;
    const doc = {
      _id: txId,
      userId: String(entry._id),
      asset,
      trade,
      quantity,
      price,
      date: String(entry.date),
      rating: entry.rating !== undefined ? Number(entry.rating) : null,
      createdAt: new Date().toISOString(),
    };

    try {
      const hash = await db.put(doc);
      res.json({ ok: true, hash, doc });
    } catch (err) {
      console.error('[add-entry] error:', err);
      res.status(500).json({ error: 'failed to write entry' });
    }
  });

  // -- All entries (for table views) -----------------------------------
  app.get('/api/entries', async (req, res) => {
    try {
      const all = await db.all();
      // db.all() returns [{ value, hash, key }, ...]; we just want the docs.
      res.json(all.map((row) => row.value));
    } catch (err) {
      console.error('[entries] error:', err);
      res.status(500).json({ error: 'failed to read entries' });
    }
  });

  // -- Query by user id (v1 compat shape) ------------------------------
  app.get('/api/query/id', async (req, res) => {
    const id = String(req.query.id || '');
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      // db.query(mapper) returns docs where mapper(doc) is truthy.
      const matches = await db.query((doc) => doc.userId === id);
      res.json(matches);
    } catch (err) {
      console.error('[query/id] error:', err);
      res.status(500).json({ error: 'query failed' });
    }
  });

  // -- Computed positions with live PnL --------------------------------
  // For a given user, aggregate BUY/SELL transactions per asset and overlay
  // the current spot price to produce: holdings, avg cost, market value,
  // unrealized PnL ($ and %).
  app.get('/api/positions', async (req, res) => {
    const id = String(req.query.id || '');
    if (!id) return res.status(400).json({ error: 'id required' });

    try {
      const [txs, prices] = await Promise.all([
        db.query((doc) => doc.userId === id),
        getPrices().catch(() => null),
      ]);

      // OrbitDB's document query iterates the index, not the oplog, so order
      // is not guaranteed. We must sort by createdAt before aggregating —
      // otherwise SELLs can be applied before their corresponding BUYs and
      // the running avg-cost calculation goes haywire.
      txs.sort((a, b) => {
        const ta = a.createdAt || a.date || '';
        const tb = b.createdAt || b.date || '';
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });

      // Aggregate per asset.
      const positions = {};
      for (const tx of txs) {
        const a = tx.asset;
        if (!positions[a]) {
          positions[a] = { asset: a, quantity: 0, costBasis: 0 };
        }
        const sign = tx.trade === 'BUY' ? 1 : -1;
        const qty = sign * tx.quantity;

        if (sign > 0) {
          // BUY: add to cost basis at trade price.
          positions[a].costBasis += tx.quantity * tx.price;
          positions[a].quantity += qty;
        } else {
          // SELL: reduce quantity proportionally at the *current* avg cost.
          const avgCost =
            positions[a].quantity > 0
              ? positions[a].costBasis / positions[a].quantity
              : 0;
          positions[a].costBasis += qty * avgCost; // qty is negative
          positions[a].quantity += qty;
        }
      }

      // Layer on live prices and compute PnL.
      const result = Object.values(positions)
        .filter((p) => p.quantity > 0.000_000_01) // hide dust / closed positions
        .map((p) => {
          const avgCost = p.quantity > 0 ? p.costBasis / p.quantity : 0;
          const spot = prices?.[p.asset]?.usd ?? null;
          const change24h = prices?.[p.asset]?.change24h ?? null;
          const marketValue = spot !== null ? p.quantity * spot : null;
          const pnl = marketValue !== null ? marketValue - p.costBasis : null;
          const pnlPct =
            marketValue !== null && p.costBasis > 0
              ? (pnl / p.costBasis) * 100
              : null;
          return {
            asset: p.asset,
            quantity: p.quantity,
            avgCost,
            costBasis: p.costBasis,
            spot,
            change24h,
            marketValue,
            pnl,
            pnlPct,
          };
        });

      const totalCost = result.reduce((s, p) => s + p.costBasis, 0);
      const totalValue = result.reduce(
        (s, p) => s + (p.marketValue ?? 0),
        0
      );
      const totalPnl = totalValue - totalCost;

      res.json({
        userId: id,
        positions: result,
        totals: {
          cost: totalCost,
          value: totalValue,
          pnl: totalPnl,
          pnlPct: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
        },
        pricesAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[positions] error:', err);
      res.status(500).json({ error: 'failed to compute positions' });
    }
  });

  app.listen(PORT, () => {
    console.log(`[server] decent-portfolio-v2 listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});