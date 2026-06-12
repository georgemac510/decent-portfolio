// Feature-flag router between HTTP (api.ts) and browser-side OrbitDB (p2p.ts).
//
// When NEXT_PUBLIC_USE_P2P=true:
//   - positions, entries, queryById are served from the local OrbitDB replica
//   - health, prices, addEntry remain HTTP-only
//
// When NEXT_PUBLIC_USE_P2P=false (default):
//   - everything goes through HTTP to the Express backend
//
// Components and hooks import from here instead of api.ts directly, so the
// switch is a single env-var flip with no code change anywhere else.

import { api } from './api';
import { p2p } from './p2p';
import { isP2pEnabled } from './heliaClient';

export const dataSource = {
  // Always HTTP.
  health: api.health,
  prices: api.prices,
  addEntry: api.addEntry,

  // P2P-capable; falls back to HTTP if flag is off.
  positions: isP2pEnabled ? p2p.positions : api.positions,
  entries: isP2pEnabled ? p2p.entries : api.entries,
  queryById: isP2pEnabled ? p2p.queryById : api.queryById,
};