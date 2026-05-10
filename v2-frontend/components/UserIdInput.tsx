'use client';

import { useEffect, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const STORAGE_KEY = 'decent-portfolio.userId';

export function UserIdInput({ value, onChange }: Props) {
  const [local, setLocal] = useState(value);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && !value) {
      setLocal(saved);
      onChange(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit() {
    const trimmed = local.trim();
    onChange(trimmed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-white/90">User ID</label>
      <input
        type="text"
        className="rounded-md border border-white/20 bg-white/95 px-3 py-1.5 font-mono text-sm text-black focus:border-portfolio-yellow focus:outline-none focus:ring-2 focus:ring-portfolio-yellow/50"
        placeholder="john"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      {value && <span className="text-xs text-white/60">viewing {value}</span>}
    </div>
  );
}
