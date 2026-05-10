// Type definitions mirroring the v2 backend API.
// Keep these in sync with backend/server.js response shapes.

export type Asset = 'BTC' | 'ZEC' | 'SOL' | 'ETH';
export type TradeKind = 'BUY' | 'SELL';

export const SUPPORTED_ASSETS: Asset[] = ['BTC', 'ZEC', 'SOL', 'ETH'];

// One row in OrbitDB.
export interface Transaction {
  _id: string;          // composite key: `${userId}:${asset}:${timestamp}`
  userId: string;
  asset: Asset;
  trade: TradeKind;
  quantity: number;
  price: number;
  date: string;          // user-supplied date (free-form)
  rating: number | null;
  createdAt: string;     // ISO timestamp
}

// /api/prices response.
export interface PriceMap {
  [asset: string]: {
    usd: number | null;
    change24h: number | null;
  };
}

// One row in the positions response.
export interface Position {
  asset: Asset;
  quantity: number;
  avgCost: number;
  costBasis: number;
  spot: number | null;
  change24h: number | null;
  marketValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
}

// /api/positions response.
export interface PositionsResponse {
  userId: string;
  positions: Position[];
  totals: {
    cost: number;
    value: number;
    pnl: number;
    pnlPct: number;
  };
  pricesAt: string;
}

// Payload sent to POST /api/add-entry.
export interface AddEntryPayload {
  _id: string;       // user id (the backend builds a per-transaction key)
  asset: Asset;
  trade: TradeKind;
  quantity: number;
  price: number;
  date: string;
  rating?: number;
}
