// Pure positions math, duplicated from v2-backend/lib/computePositions.js.
//
// This duplication is intentional: the frontend and backend don't share a
// workspace, so the simplest way to call the same logic in both places is to
// keep two copies. The function is small, pure, and unlikely to change often.
// If/when we consolidate into a monorepo, this file goes away.
//
// Input:  array of Transaction docs, optional price map
// Output: PositionsResponse-shaped object (matching backend exactly)

import type {
    Transaction,
    PriceMap,
    PositionsResponse,
    Position,
  } from './types';
  
  export function computePositions(
    userId: string,
    txs: Transaction[],
    prices: PriceMap | null = null
  ): PositionsResponse {
    // Sort by createdAt (preferred) or date (fallback) so BUYs and SELLs are
    // applied in the order they were recorded. OrbitDB document iteration is
    // not order-preserving.
    const sorted = [...txs].sort((a, b) => {
      const ta = a.createdAt || a.date || '';
      const tb = b.createdAt || b.date || '';
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
  
    // Aggregate per asset, tracking running quantity and cost basis.
    const positions: Record<string, { asset: Transaction['asset']; quantity: number; costBasis: number }> = {};
    for (const tx of sorted) {
      const a = tx.asset;
      if (!positions[a]) {
        positions[a] = { asset: a, quantity: 0, costBasis: 0 };
      }
      const sign = tx.trade === 'BUY' ? 1 : -1;
      const qty = sign * tx.quantity;
  
      if (sign > 0) {
        // BUY: add to cost basis at trade price.
        positions[a].costBasis += tx.quantity * tx.price;
        positions[a].quantity += qty;
      } else {
        // SELL: reduce quantity at the *current* avg cost.
        const avgCost =
          positions[a].quantity > 0
            ? positions[a].costBasis / positions[a].quantity
            : 0;
        positions[a].costBasis += qty * avgCost; // qty is negative
        positions[a].quantity += qty;
      }
    }
  
    // Overlay live prices and compute PnL.
    const result: Position[] = Object.values(positions)
      .filter((p) => p.quantity > 0.000_000_01) // hide dust / closed positions
      .map((p) => {
        const avgCost = p.quantity > 0 ? p.costBasis / p.quantity : 0;
        const spot = prices?.[p.asset]?.usd ?? null;
        const change24h = prices?.[p.asset]?.change24h ?? null;
        const marketValue = spot !== null ? p.quantity * spot : null;
        const pnl = marketValue !== null ? marketValue - p.costBasis : null;
        const pnlPct =
        pnl !== null && p.costBasis > 0
            ? (pnl / p.costBasis) * 100
            : null;
        return {
          asset: p.asset,
          quantity: p.quantity,
          avgCost,
          costBasis: p.costBasis,
          spot,
          change24h,
          marketValue,
          pnl,
          pnlPct,
        };
      });
  
    const totalCost = result.reduce((s, p) => s + p.costBasis, 0);
    const totalValue = result.reduce((s, p) => s + (p.marketValue ?? 0), 0);
    const totalPnl = totalValue - totalCost;
  
    return {
      userId,
      positions: result,
      totals: {
        cost: totalCost,
        value: totalValue,
        pnl: totalPnl,
        pnlPct: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
      },
      pricesAt: new Date().toISOString(),
    };
  }