'use client';

import { usePrices } from '@/hooks/usePrices';
import { SUPPORTED_ASSETS } from '@/lib/types';
import { formatUSD, formatPct, pnlClass } from '@/lib/format';

export function PriceTicker() {
  const { prices, error, loading } = usePrices();

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
        <span>Live prices</span>
        <span>
          {loading && !prices ? 'loading…' : error ? 'price feed offline' : 'updates every 30s'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SUPPORTED_ASSETS.map((asset) => {
          const p = prices?.[asset];
          return (
            <div
              key={asset}
              className="flex flex-col rounded-md bg-white/5 px-3 py-2"
            >
              <span className="font-mono text-xs text-white/70">{asset}</span>
              <span className="font-mono text-lg font-semibold text-white">
                {formatUSD(p?.usd ?? null)}
              </span>
              <span className={`font-mono text-xs ${pnlClass(p?.change24h ?? null)}`}>
                {formatPct(p?.change24h ?? null, { showSign: true })} 24h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
