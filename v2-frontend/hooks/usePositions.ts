'use client';

import { useCallback, useEffect, useState } from 'react';
import { dataSource as api } from '@/lib/dataSource';
import type { PositionsResponse } from '@/lib/types';

const POLL_MS = 30_000;

interface State {
  data: PositionsResponse | null;
  error: string | null;
  loading: boolean;
}

export function usePositions(userId: string | null) {
  const [state, setState] = useState<State>({
    data: null,
    error: null,
    loading: !!userId,
  });

  const fetchPositions = useCallback(
    async (signal?: AbortSignal) => {
      if (!userId) {
        setState({ data: null, error: null, loading: false });
        return;
      }
      try {
        const data = await api.positions(userId, signal);
        if (signal?.aborted) return;
        setState({ data, error: null, loading: false });
      } catch (err) {
        if (signal?.aborted) return;
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : 'positions fetch failed',
          loading: false,
        }));
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;
    const ac = new AbortController();
    fetchPositions(ac.signal);
    const id = setInterval(() => fetchPositions(ac.signal), POLL_MS);
    return () => {
      ac.abort();
      clearInterval(id);
    };
  }, [userId, fetchPositions]);

  // Expose a manual refresh callers can trigger after writes (add-entry).
  const refresh = useCallback(() => fetchPositions(), [fetchPositions]);

  return { ...state, refresh };
}
