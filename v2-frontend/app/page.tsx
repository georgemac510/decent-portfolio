'use client';

import { useState } from 'react';
import { PriceTicker } from '@/components/PriceTicker';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { PositionsTable } from '@/components/PositionsTable';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { UserIdInput } from '@/components/UserIdInput';
import { usePositions } from '@/hooks/usePositions';

export default function HomePage() {
  const [userId, setUserId] = useState('');
  const { data, loading, error, refresh } = usePositions(userId || null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 md:py-12">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Decent Portfolio <span aria-label="thumbs up">👍</span>
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Peer-to-peer portfolio tracker on OrbitDB
          </p>
        </div>
        <UserIdInput value={userId} onChange={setUserId} />
      </header>

      <PriceTicker />

      {userId ? (
        <>
          <PortfolioSummary data={data} />
          <AddTransactionForm userId={userId} onSuccess={refresh} />
          <PositionsTable data={data} loading={loading} error={error} />
        </>
      ) : (
        <div className="rounded-lg border border-white/10 bg-black/20 p-8 text-center text-white/80">
          Enter a User ID above to start tracking a portfolio.
        </div>
      )}

      <footer className="mt-auto pt-6 text-center text-xs text-white/60">
        Data persists in OrbitDB on IPFS. Prices via CoinGecko.
      </footer>
    </main>
  );
}
