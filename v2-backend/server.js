// Decent Portfolio v2 backend
// https://github.com/georgemac510/decent-portfolio
// Built by John McLaughlin

// Decent Portfolio v2 — Express API on top of OrbitDB.


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initOrbitDB } from './orbitdb.js';
import { getPrices, SUPPORTED_ASSETS } from './prices.js';
import { rateLimit } from './rate-limit.js';
import fetch from 'node-fetch';
import { multiaddr } from '@multiformats/multiaddr';
import { computePositions } from './lib/computePositions.js';
import { assembleContextBundle } from './lib/contextBundle.js';

const PORT = Number(process.env.PORT) || 3001;

// Origins allowed to call this API. Production is the Vercel deploy plus the
// custom domain (when there is one). Localhost is always allowed for local
// frontend development. ALLOWED_ORIGINS env var can extend this list.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://decent-portfolio.vercel.app',
  'http://localhost:3000',
  'http://localhost:3002',
];
const ALLOWED_ORIGINS = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]);

async function main() {
  const { db, orbitdb, libp2p } = await initOrbitDB();

  // Register the database with relay-pinner for replication.
  // First dial relay-pinner over libp2p (so its sync has a connected peer to replicate from).
  // Then fire the HTTP /pinning/sync trigger — fire-and-forget since it can take 30+ seconds.
  const relayPinnerUrl = process.env.RELAY_PINNER_HTTP;
  const relayPinnerMultiaddr = process.env.RELAY_PINNER_MULTIADDR;
  if (relayPinnerUrl && relayPinnerMultiaddr) {
    try {
      await libp2p.dial(multiaddr(relayPinnerMultiaddr));
      console.log(`[relay-pinner] dialed ${relayPinnerMultiaddr}`);
    } catch (err) {
      console.error('[relay-pinner] libp2p dial failed:', err.message);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    fetch(`${relayPinnerUrl}/pinning/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbAddress: db.address.toString() }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          console.log(`[relay-pinner] registered ${db.address} for replication`);
        } else {
          console.error('[relay-pinner] registration failed:', json.error);
        }
      })
      .catch((err) => {
        console.error('[relay-pinner] could not reach relay-pinner:', err.message);
      })
      .finally(() => clearTimeout(timeoutId));
    console.log('[relay-pinner] registration initiated (async)');
  } else {
    console.log('[relay-pinner] RELAY_PINNER_HTTP or RELAY_PINNER_MULTIADDR not set; skipping replication setup');
  }

  const app = express();

  app.set('trust proxy', true);

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); 
        if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
    })
  );

  app.use(express.json({ limit: '32kb' }));

  // Rate limit by default.
  const defaultLimit = rateLimit({
    category: 'default',
    windowMs: 60_000,
    max: 60,
  });
  const pricesLimit = rateLimit({
    category: 'prices',
    windowMs: 60_000,
    max: 10,
  });
  const writeLimit = rateLimit({
    category: 'writes',
    windowMs: 60_000,
    max: 5,
  });
  app.use(defaultLimit);

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
  app.get('/api/prices', pricesLimit, async (req, res) => {
    try {
      const prices = await getPrices();
      res.json(prices);
    } catch (err) {
      res.status(502).json({ error: 'price feed unavailable' });
    }
  });

  // -- Add transaction --------------------------------------------------
  app.post('/api/add-entry', writeLimit, async (req, res) => {
 
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return res.status(403).json({ error: 'origin not allowed' });
    }

    const entry = req.body;

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

  // -- All entries (admin/debug only) ----------------------------------
  app.get('/api/entries', async (req, res) => {
    const origin = req.headers.origin;
    if (origin !== 'http://localhost:3000' && origin !== 'http://localhost:3002') {
      return res.status(403).json({ error: 'restricted endpoint' });
    }
    try {
      const all = await db.all();
      res.json(all.map((row) => row.value));
    } catch (err) {
      console.error('[entries] error:', err);
      res.status(500).json({ error: 'failed to read entries' });
    }
  });

  // -- Query by user id ------------------------------------------------
  app.get('/api/query/id', async (req, res) => {
    const id = String(req.query.id || '');
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      const matches = await db.query((doc) => doc.userId === id);
      res.json(matches);
    } catch (err) {
      console.error('[query/id] error:', err);
      res.status(500).json({ error: 'query failed' });
    }
  });

  // -- Computed positions with live PnL --------------------------------

  app.get('/api/positions', async (req, res) => {
    const id = String(req.query.id || '');
    if (!id) return res.status(400).json({ error: 'id required' });
  
    try {
      const [txs, prices] = await Promise.all([
        db.query((doc) => doc.userId === id),
        getPrices().catch(() => null),
      ]);
  
      const response = computePositions(id, txs, prices);
      res.json(response);
    } catch (err) {
      console.error('[positions] error:', err);
      res.status(500).json({ error: 'failed to compute positions' });
    }
  });

  // Phase E Chunk 1 verification endpoint — returns the raw context bundle.
  app.get('/api/insight/bundle', async (req, res) => {
    const id = String(req.query.id || '');
    if (!id) return res.status(400).json({ error: 'id required' });

    try {
      const bundle = await assembleContextBundle({ userId: id, db });
      res.json(bundle);
    } catch (err) {
      console.error('[insight/bundle] error:', err);
      res.status(500).json({ error: 'failed to assemble context bundle' });
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