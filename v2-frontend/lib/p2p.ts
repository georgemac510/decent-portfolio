// Browser-side OrbitDB read path with HTTP fallback.

import { getHeliaClient } from './heliaClient';
import { computePositions } from './computePositions';
import { api } from './api';
import type { PositionsResponse, Transaction } from './types';

const HELIA_INIT_TIMEOUT_MS = 10_000;

let heliaUnavailable = false; // sticky once we've decided WSS doesn't work

async function getClientOrFail(): Promise<Awaited<ReturnType<typeof getHeliaClient>> | null> {
  if (heliaUnavailable) return null;
  try {
    return await Promise.race([
      getHeliaClient(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('helia-init-timeout')), HELIA_INIT_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.warn('[p2p] helia unavailable, falling back to HTTP:', (err as Error).message);
    heliaUnavailable = true;
    return null;
  }
}

async function readAllTransactions(): Promise<Transaction[]> {
  const client = await getClientOrFail();
  if (!client) return api.entries();
  const rows = await client.db.all();
  return rows.map((row: { value: Transaction }) => row.value);
}

async function queryByUserId(userId: string): Promise<Transaction[]> {
  const client = await getClientOrFail();
  if (!client) return api.queryById(userId);
  return client.db.query((doc: Transaction) => doc.userId === userId);
}

export const p2p = {
  positions: async (userId: string, signal?: AbortSignal): Promise<PositionsResponse> => {
    const client = await getClientOrFail();
    if (!client) return api.positions(userId, signal);
    const [txs, prices] = await Promise.all([
      queryByUserId(userId),
      api.prices(signal).catch(() => null),
    ]);
    return computePositions(userId, txs, prices);
  },

  entries: async (_signal?: AbortSignal): Promise<Transaction[]> => {
    return readAllTransactions();
  },

  queryById: async (userId: string, _signal?: AbortSignal): Promise<Transaction[]> => {
    return queryByUserId(userId);
  },
};