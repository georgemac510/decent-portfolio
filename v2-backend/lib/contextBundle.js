import { computePositions } from './computePositions.js';
import { getPrices } from '../prices.js';

const BUNDLE_VERSION = '1.0';

/**
 * Build a context bundle for a user's portfolio.
 * Pure w.r.t. the reasoning layer — no LLM calls happen here.
 *
 * @param {Object} args
 * @param {string} args.userId - The user whose portfolio to summarize
 * @param {Object} args.db - The OrbitDB Documents instance (from initOrbitDB)
 * @param {Object} [args.options] - Reserved for later (e.g. hyperliquidAddress)
 * @returns {Promise<Object>} Bundle matching PHASE-E.md § "Context bundle spec"
 */
export async function assembleContextBundle({ userId, db, options = {} }) {
  if (!userId) throw new Error('userId is required');
  if (!db) throw new Error('db is required');

  const generatedAt = new Date().toISOString();

  // Fetch transactions and prices in parallel, matching /api/positions.
  const [txs, prices] = await Promise.all([
    db.query((doc) => doc.userId === userId),
    getPrices().catch(() => null),
  ]);

  // computePositions returns { userId, positions, totals, pricesAt }
  const computed = computePositions(userId, txs, prices);

  // Reshape positions to spec field names (pnl -> unrealizedPnl, change24h -> change24hPct).
  const positions = computed.positions.map((p) => ({
    asset: p.asset,
    quantity: p.quantity,
    avgCost: p.avgCost,
    costBasis: p.costBasis,
    spot: p.spot,
    marketValue: p.marketValue,
    unrealizedPnl: p.pnl,
    unrealizedPnlPct: p.pnlPct,
    change24hPct: p.change24h,
  }));

  // Reshape totals to spec field names (cost -> costBasis, value -> marketValue).
  const totals = {
    costBasis: computed.totals.cost,
    marketValue: computed.totals.value,
    unrealizedPnl: computed.totals.pnl,
    unrealizedPnlPct: computed.totals.pnlPct,
  };

  // Note: pricesAt in computePositions is currently the time of the compute call
  const priceAgeSeconds = computed.pricesAt
    ? Math.max(0, Math.round((Date.now() - Date.parse(computed.pricesAt)) / 1000))
    : null;

  const assetsCovered = positions.map((p) => p.asset);

  return {
    bundleVersion: BUNDLE_VERSION,
    generatedAt,
    userId,
    portfolio: {
      positions,
      totals,
      positionCount: positions.length,
    },
    hyperliquid: null,
    marketContext: {
      assetsCovered,
      priceSource: 'prices.js',
      priceAgeSeconds,
    },
  };
}
