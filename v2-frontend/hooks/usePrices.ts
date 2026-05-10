'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { PriceMap } from '@/lib/types';

const POLL_MS = 30_000;

interface State {
  prices: PriceMap | null;
  error: string | null;
  loading: boolean;
}

export function usePrices(): State {
  const [state, setState] = useState<State>({
    prices: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function fetchOnce() {
      try {
        const prices = await api.prices(ac.signal);
        if (!cancelled) setState({ prices, error: null, loading: false });
      } catch (err) {
        if (cancelled || ac.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'price fetch failed',
          loading: false,
        }));
      }
    }

    fetchOnce();
    const id = setInterval(fetchOnce, POLL_MS);

    return () => {
      cancelled = true;
      ac.abort();
      clearInterval(id);
    };
  }, []);

  return state;
}