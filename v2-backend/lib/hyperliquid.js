// Hyperliquid Info API client.
// Public read-only calls; no auth. Fetches both perps clearinghouse state
// and spot balances for a given address, returning a combined view.
// See: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const FETCH_TIMEOUT_MS = 2000;

/**
 * Fetch both perps and spot state for a Hyperliquid account.
 *
 * Returns a normalized combined object, or null if the address is invalid.
 * If one of the two upstream calls fails, that section is null but the other
 * is still returned — the insight proceeds with whatever data is available.
 *
 * @param {string} address - EVM address (0x...)
 * @returns {Promise<object|null>}
 */
export async function fetchHyperliquidState(address) {
  if (!address || typeof address !== 'string') return null;
  const normalized = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) return null;

  const [perps, spot] = await Promise.all([
    fetchPerpsState(normalized),
    fetchSpotState(normalized),
  ]);

  // If both failed completely, treat as no data.
  if (perps === null && spot === null) return null;

  // Keep the top-level perps fields (accountValue, totalMarginUsed, positions)
  // for backward compatibility, add spot alongside.
  return {
    address: normalized,
    accountValue: perps?.accountValue ?? 0,
    totalMarginUsed: perps?.totalMarginUsed ?? 0,
    positions: perps?.positions ?? [],
    spot: spot ?? null,
  };
}

async function fetchPerpsState(address) {
  const raw = await postInfo({ type: 'clearinghouseState', user: address });
  if (!raw) return null;
  return normalizePerpsState(raw);
}

async function fetchSpotState(address) {
  const raw = await postInfo({ type: 'spotClearinghouseState', user: address });
  if (!raw) return null;
  return normalizeSpotState(raw);
}

async function postInfo(body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[hyperliquid] ${body.type} failed:`, err.message || err.name);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePerpsState(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const summary = raw.marginSummary || {};
  const accountValue = Number(summary.accountValue ?? 0);
  const totalMarginUsed = Number(summary.totalMarginUsed ?? 0);

  const positions = Array.isArray(raw.assetPositions)
    ? raw.assetPositions
        .map((p) => {
          const pos = p?.position || {};
          const size = Number(pos.szi ?? 0);
          if (!Number.isFinite(size) || size === 0) return null;
          return {
            coin: pos.coin || 'UNKNOWN',
            size,
            entryPrice: Number(pos.entryPx ?? 0),
            unrealizedPnl: Number(pos.unrealizedPnl ?? 0),
            leverage: Number(pos.leverage?.value ?? 0),
          };
        })
        .filter(Boolean)
    : [];

  return { accountValue, totalMarginUsed, positions };
}

function normalizeSpotState(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Keep only non-zero balances. Zero-balance tokens are noise.
  const balances = Array.isArray(raw.balances)
    ? raw.balances
        .map((b) => {
          const total = Number(b?.total ?? 0);
          if (!Number.isFinite(total) || total === 0) return null;
          return {
            coin: b.coin || 'UNKNOWN',
            total,
            hold: Number(b?.hold ?? 0),
          };
        })
        .filter(Boolean)
    : [];

  return { balances };
}