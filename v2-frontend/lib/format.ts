// Display formatting. All computation stays in raw numbers; only the
// presentation layer rounds. Keeps the floating-point precision issues
// (0.060000000000000005) from leaking into the UI.

export function formatUSD(
  value: number | null | undefined,
  opts: { showSign?: boolean } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = opts.showSign && value > 0 ? '+' : '';
  return (
    sign +
    value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatPct(
  value: number | null | undefined,
  opts: { showSign?: boolean } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = opts.showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Crypto quantities can be tiny; allow more decimals but trim trailing zeros.
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value === 0) return '0';
  // Use up to 8 decimals (BTC convention), trim trailing zeros.
  const abs = Math.abs(value);
  const decimals = abs < 0.01 ? 8 : abs < 1 ? 6 : 4;
  return value
    .toFixed(decimals)
    .replace(/\.?0+$/, '');
}

// Choose the green/red shade based on PnL sign. Returns Tailwind class names.
export function pnlClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return 'text-white/80';
  return value > 0 ? 'text-portfolio-gain' : 'text-portfolio-loss';
}
