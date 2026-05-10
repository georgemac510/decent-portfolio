'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { SUPPORTED_ASSETS, type Asset, type TradeKind } from '@/lib/types';

interface Props {
  userId: string;
  onSuccess?: () => void;
}

interface FormState {
  asset: Asset;
  trade: TradeKind;
  quantity: string;   // strings while editing; parsed on submit
  price: string;
  date: string;
  rating: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const initialState: FormState = {
  asset: 'BTC',
  trade: 'BUY',
  quantity: '',
  price: '',
  date: today(),
  rating: '',
};

export function AddTransactionForm({ userId, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId.trim()) {
      setError('User ID is required.');
      return;
    }
    const quantity = Number(form.quantity);
    const price = Number(form.price);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Price must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      await api.addEntry({
        _id: userId.trim(),
        asset: form.asset,
        trade: form.trade,
        quantity,
        price,
        date: form.date,
        rating: form.rating ? Number(form.rating) : undefined,
      });
      setSuccess(`${form.trade} ${quantity} ${form.asset} @ ${price} recorded.`);
      setForm({ ...initialState, asset: form.asset, trade: form.trade, date: today() });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry.');
    } finally {
      setSubmitting(false);
    }
  }

  const labelStyle = 'flex flex-col gap-1 text-sm font-medium text-white/90';
  const inputStyle =
    'rounded-md border border-white/20 bg-white/95 px-3 py-2 font-mono text-sm text-black ' +
    'focus:border-portfolio-yellow focus:outline-none focus:ring-2 focus:ring-portfolio-yellow/50';

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-white/10 bg-black/20 p-5"
    >
      <h2 className="text-xl font-bold text-white">Add Transaction</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <label className={labelStyle}>
          Asset
          <select
            className={inputStyle}
            value={form.asset}
            onChange={(e) => update('asset', e.target.value as Asset)}
          >
            {SUPPORTED_ASSETS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label className={labelStyle}>
          Side
          <select
            className={inputStyle}
            value={form.trade}
            onChange={(e) => update('trade', e.target.value as TradeKind)}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </label>

        <label className={labelStyle}>
          Date
          <input
            type="date"
            className={inputStyle}
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </label>

        <label className={labelStyle}>
          Quantity
          <input
            type="number"
            step="any"
            inputMode="decimal"
            className={inputStyle}
            placeholder="0.05"
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
          />
        </label>

        <label className={labelStyle}>
          Price (USD)
          <input
            type="number"
            step="any"
            inputMode="decimal"
            className={inputStyle}
            placeholder="80000"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
          />
        </label>

        <label className={labelStyle}>
          Rating (optional)
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            inputMode="numeric"
            className={inputStyle}
            placeholder="0–100"
            value={form.rating}
            onChange={(e) => update('rating', e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-portfolio-yellow px-5 py-2 font-semibold text-black transition hover:bg-portfolio-yellow-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
        {error && <span className="text-sm text-portfolio-loss">{error}</span>}
        {success && <span className="text-sm text-portfolio-gain">{success}</span>}
      </div>
    </form>
  );
}
