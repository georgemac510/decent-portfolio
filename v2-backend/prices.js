// Price feed: thin wrapper around CoinGecko's free /simple/price endpoint.
// Caches results in memory for CACHE_TTL_MS so we don't hammer the free tier
// (limit ~10-30 req/min depending on time of day).

import fetch from 'node-fetch';

const CACHE_TTL_MS = 10_000;

// CoinGecko IDs for the four supported assets.
const COIN_IDS = {
  BTC: 'bitcoin',
  ZEC: 'zcash',
  SOL: 'solana',
  ETH: 'ethereum',
};

const ENDPOINT =
  'https://api.coingecko.com/api/v3/simple/price' +
  `?ids=${Object.values(COIN_IDS).join(',')}` +
  '&vs_currencies=usd' +
  '&include_24hr_change=true';

let cache = { data: null, fetchedAt: 0 };

export async function getPrices() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const res = await fetch(ENDPOINT, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`coingecko ${res.status}: ${await res.text()}`);
    }
    const raw = await res.json();

    // Normalize to our ticker shape: { BTC: { usd, change24h }, ... }
    const normalized = Object.fromEntries(
      Object.entries(COIN_IDS).map(([ticker, geckoId]) => [
        ticker,
        {
          usd: raw[geckoId]?.usd ?? null,
          change24h: raw[geckoId]?.usd_24h_change ?? null,
        },
      ])
    );

    cache = { data: normalized, fetchedAt: now };
    return normalized;
  } catch (err) {
    console.error('[prices] fetch failed:', err.message);
    // If we have stale cache, return it rather than failing the request.
    if (cache.data) return cache.data;
    throw err;
  }
}

export const SUPPORTED_ASSETS = Object.keys(COIN_IDS);
