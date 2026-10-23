'use client';

import { useState } from 'react';
import { Download, Star } from 'lucide-react';
import { currencyFromSymbol } from '@/lib/currency';
import { DISPLAY_CURRENCIES } from '@/lib/money';
import { useMoney } from '@/components/Money';
import { cleanPrice } from '@/lib/currency';
import { hostOf } from '@/lib/format';
import { ItemImage } from './ItemImage';

export interface ItemFormValues {
  title: string;
  url: string;
  imageUrl: string;
  price: string;
  currency: string;
  quantity: number;
  priority: number;
  note: string;
}

export function emptyValues(partial: Partial<ItemFormValues> = {}, currency = 'EUR'): ItemFormValues {
  return { title: '', url: '', imageUrl: '', price: '', currency, quantity: 1, priority: 0, note: '', ...partial };
}

/** Fetch name, photo and price for a link through our server. */
export async function unfurl(url: string): Promise<{ values: Partial<ItemFormValues>; partial: boolean } | { error: string }> {
  const response = await fetch('/api/unfurl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { error: data.error || 'Could not read that link.' };
  const p = data.product || {};
  return {
    partial: Boolean(data.partial),
    values: {
      url: p.url || url,
      title: p.title || '',
      imageUrl: p.imageUrl || '',
      price: p.price !== null && p.price !== undefined ? String(p.price) : '',
      currency: p.currency || '',
    },
  };
}

export function ItemEditor({
  initial,
  mode,
  onSave,
  onCancel,
}: {
  initial: ItemFormValues;
  mode: 'add' | 'edit';
  onSave: (values: ItemFormValues) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [hint, setHint] = useState('');
  const money = useMoney();
  const typed = cleanPrice(values.price);
  const preview = typed !== null ? money.price(typed, values.currency) : null;
  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const fetchDetails = async () => {
    if (!values.url.trim() || fetching) return;
    setFetching(true);
    setHint('');
    const result = await unfurl(values.url.trim());
    setFetching(false);
    if ('error' in result) {
      setHint(result.error);
      return;
    }
    setValues((v) => ({
      ...v,
      url: result.values.url || v.url,
      title: result.values.title || v.title,
      imageUrl: result.values.imageUrl || v.imageUrl,
      price: result.values.price || v.price,
      currency: result.values.currency || v.currency,
    }));
    if (result.partial) setHint('That store didn’t share its details with us. Fill them in, or use the bookmarklet on the product page.');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await onSave(values);
    if (!ok) setBusy(false);
  };

  const onPriceBlur = () => {
    const guessed = currencyFromSymbol(values.price, hostOf(values.url));
    if (guessed && DISPLAY_CURRENCIES.includes(guessed)) set('currency', guessed);
  };

  return (
    <form onSubmit={submit} className="p-5 sm:p-6 space-y-4">
      <div>
        <label className="field-label" htmlFor="item-url">Link</label>
        <div className="flex gap-2">
          <input id="item-url" className="field" type="url" inputMode="url" placeholder="https://store.example/product" value={values.url} onChange={(e) => set('url', e.target.value)} />
          <button type="button" className="btn btn-ghost shrink-0 !h-[44px]" onClick={fetchDetails} disabled={!values.url.trim() || fetching} title="Fill in from the link">
            {fetching ? <span className="spinner" /> : <Download size={16} />} <span className="hidden sm:inline">Fetch</span>
          </button>
        </div>
        {hint && <p className="field-note !text-[var(--color-warn)]">{hint}</p>}
      </div>

      <div className="grid grid-cols-[84px_1fr] gap-4 items-start">
        <div className="aspect-square rounded-[4px] overflow-hidden border border-[var(--color-line)] bg-[#f4f4f6]">
          <ItemImage src={values.imageUrl || null} alt="" store={hostOf(values.url)} className="w-full h-full object-contain p-1.5" />
        </div>
        <div>
          <label className="field-label" htmlFor="item-title">Name</label>
          <input id="item-title" className="field" required maxLength={200} placeholder="What do you wish for?" value={values.title} onChange={(e) => set('title', e.target.value)} autoFocus={mode === 'add' && !values.title} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_110px_90px] gap-3">
        <div>
          <label className="field-label" htmlFor="item-price">Price</label>
          <input id="item-price" className="field tnum" inputMode="decimal" placeholder="0.00" value={values.price} onChange={(e) => set('price', e.target.value)} onBlur={onPriceBlur} />
        </div>
        <div>
          <label className="field-label" htmlFor="item-currency">Currency</label>
          <select id="item-currency" className="field" value={values.currency} onChange={(e) => set('currency', e.target.value)}>
            {[...new Set([values.currency, ...DISPLAY_CURRENCIES])].filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="item-qty">Wanted</label>
          <input id="item-qty" className="field tnum" type="number" min={1} max={999} value={values.quantity} onChange={(e) => set('quantity', Math.max(1, Number(e.target.value) || 1))} />
        </div>
      </div>

      {preview && (
        <p className="-mt-2 text-[12.5px] muted tnum" aria-live="polite">
          {preview.converted ? (
            <>
              {preview.original} is about <b className="text-[var(--color-violet-lift)]">{preview.local}</b> at today’s rate. You set the price in the store’s currency; everyone sees it in theirs too.
            </>
          ) : (
            <>Shown as <b className="text-[var(--color-violet-lift)]">{preview.local}</b>. People elsewhere see it converted into their own currency.</>
          )}
        </p>
      )}

      <div>
        <label className="field-label" htmlFor="item-image">Photo link</label>
        <input id="item-image" className="field" type="url" placeholder="https://…/photo.jpg" value={values.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
      </div>

      <div>
        <label className="field-label" htmlFor="item-note">Note</label>
        <textarea id="item-note" className="field" maxLength={1000} placeholder="Size, colour, the version you mean…" value={values.note} onChange={(e) => set('note', e.target.value)} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button type="button" role="switch" aria-checked={values.priority > 0} className="toggle" onClick={() => set('priority', values.priority > 0 ? 0 : 1)} />
        <span className="text-[14px] font-semibold inline-flex items-center gap-1.5">
          <Star size={15} className="text-[var(--color-violet-lift)]" /> Most wanted
        </span>
      </label>

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" className="btn btn-bare" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !values.title.trim()}>
          {busy ? <span className="spinner" /> : null} {mode === 'add' ? 'Add to wishlist' : 'Save'}
        </button>
      </div>
    </form>
  );
}
