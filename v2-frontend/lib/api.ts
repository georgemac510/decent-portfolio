// Single source of truth for backend calls. Every fetch in the app goes
// through here so the base URL, error handling, and types stay consistent.

import type {
  AddEntryPayload,
  PriceMap,
  PositionsResponse,
  Transaction,
} from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://orbitdb-servermckurz.com';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new ApiError(res.status, `${res.status} ${detail || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{
      status: string;
      version: string;
      dbAddress: string;
      supportedAssets: string[];
    }>('/api/health'),

  prices: (signal?: AbortSignal) =>
    request<PriceMap>('/api/prices', { signal }),

  positions: (userId: string, signal?: AbortSignal) =>
    request<PositionsResponse>(
      `/api/positions?id=${encodeURIComponent(userId)}`,
      { signal }
    ),

  entries: (signal?: AbortSignal) =>
    request<Transaction[]>('/api/entries', { signal }),

  queryById: (userId: string, signal?: AbortSignal) =>
    request<Transaction[]>(
      `/api/query/id?id=${encodeURIComponent(userId)}`,
      { signal }
    ),

  addEntry: (payload: AddEntryPayload) =>
    request<{ ok: boolean; hash: string; doc: Transaction }>(
      '/api/add-entry',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};

export { ApiError, API_BASE };
