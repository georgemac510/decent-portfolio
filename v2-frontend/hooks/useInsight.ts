'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface InsightData {
  insight: string;
  generatedAt: string;
  model: string;
}

interface State {
  data: InsightData | null;
  error: string | null;
  loading: boolean;
}

// Unlike usePositions, useInsight does NOT poll — insights are user-triggered
// because each request costs money and takes 3-5 seconds. Callers invoke
// `generate()` to fetch, `reset()` to clear.
export function useInsight(userId: string | null) {
  const [state, setState] = useState<State>({
    data: null,
    error: null,
    loading: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    if (!userId) return;

    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState({ data: null, error: null, loading: true });

    try {
      const data = await api.insight(userId, ac.signal);
      if (ac.signal.aborted) return;
      setState({ data, error: null, loading: false });
    } catch (err) {
      if (ac.signal.aborted) return;
      setState({
        data: null,
        error: err instanceof Error ? err.message : 'insight generation failed',
        loading: false,
      });
    }
  }, [userId]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ data: null, error: null, loading: false });
  }, []);

  return { ...state, generate, reset };
}