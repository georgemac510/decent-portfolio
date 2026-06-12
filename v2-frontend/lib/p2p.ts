// Browser-side OrbitDB read path.
// Methods that can be served from a local OrbitDB replica (positions, entries, queryById). 

import { getHeliaClient } from './heliaClient';
import { computePositions } from './computePositions';
import { api } from './api';
import type {
  PositionsResponse,
  Transaction,
} from './types';

async function readAllTransactions(): Promise<Transaction[]> {
  const { db } = await getHeliaClient();
  // OrbitDB document store's .all() returns [{ hash, key, value }, ...].
  // We only need the document values.
  const rows = await db.all();
  return rows.map((row: { value: Transaction }) => row.value);
}

async function queryByUserId(userId: string): Promise<Transaction[]> {
  const { db } = await getHeliaClient();
  // db.query takes a predicate; the docstore evaluates it against each doc.
  const matches = await db.query((doc: Transaction) => doc.userId === userId);
  return matches;
}

export const p2p = {
  /**
   * Read positions for a user from the local OrbitDB replica.
   * Prices still come from the HTTP API (server-side cached).
   */
  positions: async (userId: string, signal?: AbortSignal): Promise<PositionsResponse> => {
    // Fetch user's transactions from local DB and prices from HTTP in parallel.
    const [txs, prices] = await Promise.all([
      queryByUserId(userId),
      api.prices(signal).catch(() => null),
    ]);
    return computePositions(userId, txs, prices);
  },

  /**
   * Read all transactions from the local OrbitDB replica.
   */
  entries: async (_signal?: AbortSignal): Promise<Transaction[]> => {
    return readAllTransactions();
  },

  /**
   * Filter transactions by user ID from the local OrbitDB replica.
   */
  queryById: async (userId: string, _signal?: AbortSignal): Promise<Transaction[]> => {
    return queryByUserId(userId);
  },
};