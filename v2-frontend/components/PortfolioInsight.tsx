'use client';

import { useInsight } from '@/hooks/useInsight';

interface Props {
  userId: string | null;
}

// AI Analyst — user-triggered portfolio insight.
// SCAFFOLD ONLY: functional, but styling and error copy need a polish pass.
export function PortfolioInsight({ userId }: Props) {
  const { data, loading, error, generate } = useInsight(userId);

  if (!userId) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">AI Analyst</h2>
          <p className="text-xs text-white/60">
            Natural-language analysis of your current portfolio
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
        >
          {loading ? 'Analyzing…' : data ? 'Regenerate' : 'Analyze Portfolio'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="mt-4 space-y-3">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
            {data.insight}
          </div>
          <div className="text-xs text-white/50">
            Generated {new Date(data.generatedAt).toLocaleString()} · {data.model} · Not financial advice.
          </div>
        </div>
      )}
    </div>
  );
}