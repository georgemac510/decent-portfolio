'use client';

import type { PositionsResponse } from '@/lib/types';
import { formatUSD, formatPct, pnlClass } from '@/lib/format';

interface Props {
  data: PositionsResponse | null;
}

export function PortfolioSummary({ data }: Props) {
  const totals = data?.totals;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card label="Cost Basis" value={formatUSD(totals?.cost)} />
      <Card label="Market Value" value={formatUSD(totals?.value)} />
      <Card
        label="Unrealized PnL"
        value={formatUSD(totals?.pnl, { showSign: true })}
        valueClass={pnlClass(totals?.pnl)}
      />
      <Card
        label="Return %"
        value={formatPct(totals?.pnlPct, { showSign: true })}
        valueClass={pnlClass(totals?.pnlPct)}
      />
    </div>
  );
}

function Card({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-white/60">{label}</div>
      <div className={`mt-1 font-mono text-xl font-semibold ${valueClass || 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
