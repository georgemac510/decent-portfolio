'use client';

import type { PositionsResponse } from '@/lib/types';
import { formatUSD, formatPct, formatQuantity, pnlClass } from '@/lib/format';

interface Props {
  data: PositionsResponse | null;
  loading: boolean;
  error: string | null;
}

export function PositionsTable({ data, loading, error }: Props) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Positions</h2>
        {data && (
          <span className="text-xs text-white/60">
            updated {new Date(data.pricesAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded bg-portfolio-loss/20 px-3 py-2 text-sm text-portfolio-loss">
          {error}
        </div>
      )}

      {!error && loading && !data && (
        <div className="py-8 text-center text-sm text-white/60">loading positions…</div>
      )}

      {!error && data && data.positions.length === 0 && (
        <div className="py-8 text-center text-sm text-white/60">
          No open positions yet. Add a transaction above to get started.
        </div>
      )}

      {!error && data && data.positions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/60">
                <th className="py-2 pr-4">Asset</th>
                <th className="py-2 pr-4 text-right">Quantity</th>
                <th className="py-2 pr-4 text-right">Avg Cost</th>
                <th className="py-2 pr-4 text-right">Spot</th>
                <th className="py-2 pr-4 text-right">Market Value</th>
                <th className="py-2 pr-4 text-right">PnL</th>
                <th className="py-2 text-right">PnL %</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {data.positions.map((p) => (
                <tr key={p.asset} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-sans font-semibold">{p.asset}</td>
                  <td className="py-3 pr-4 text-right">{formatQuantity(p.quantity)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(p.avgCost)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(p.spot)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(p.marketValue)}</td>
                  <td className={`py-3 pr-4 text-right ${pnlClass(p.pnl)}`}>
                    {formatUSD(p.pnl, { showSign: true })}
                  </td>
                  <td className={`py-3 text-right ${pnlClass(p.pnlPct)}`}>
                    {formatPct(p.pnlPct, { showSign: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
