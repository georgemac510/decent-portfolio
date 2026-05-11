// Price feed: thin wrapper around CoinGecko's free /simple/price endpoint.
// Caches results in memory for CACHE_TTL_MS so we don't hammer the free tier.
//
// CoinGecko's free "demo" tier allows roughly 5-15 requests/minute (it
// fluctuates). At one request per minute we stay well under any cap and
// still keep prices reasonably fresh — a portfolio tracker doesn't need
// second-resolution data. The frontend polls every 30s, so most polls
// will be served straight from this cache without hitting CoinGecko.

import fetch from 'node-fetch';

const CACHE_TTL_MS = 60_000;

// Backoff window after a 429: if CoinGecko told us to slow down, don't
// retry for at least this long. Returns stale cache during the backoff.
const BACKOFF_MS = 120_000;
let backoffUntil = 0;

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
  // If we recently got rate-limited, don't hit CoinGecko again until the
  // backoff window expires. Serve whatever's in cache (even if stale).
  if (cache.data && now < backoffUntil) {
    return cache.data;
  }

  try {
    const res = await fetch(ENDPOINT, {
      headers: { accept: 'application/json' },
    });
    if (res.status === 429) {
      backoffUntil = now + BACKOFF_MS;
      console.warn(
        `[prices] rate-limited, backing off for ${BACKOFF_MS / 1000}s`
      );
      if (cache.data) return cache.data;
      throw new Error('rate-limited and no cached data available');
    }
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
