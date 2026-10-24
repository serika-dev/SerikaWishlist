'use client';

import { useState } from 'react';
import { Download, Star } from 'lucide-react';
import { currencyFromSymbol } from '@/lib/currency';
import { DISPLAY_CURRENCIES } from '@/lib/money';
import { useMoney } from '@/components/Money';
import { useToast } from '@/components/Toaster';
import { UploadButton, uploadImageFile } from '@/components/UploadButton';
import { cleanPrice } from '@/lib/currency';
import { hostOf } from '@/lib/format';
import { VariantPicker } from '@/components/VariantPicker';
import type { ProductVariant } from '@/lib/types';
import { ItemImage } from './ItemImage';

export interface ItemFormValues {
  title: string;
  variant: string;
  url: string;
  imageUrl: string;
  price: string;
  currency: string;
  quantity: number;
  priority: number;
  note: string;
}

export function emptyValues(partial: Partial<ItemFormValues> = {}, currency = 'EUR'): ItemFormValues {
  return { title: '', variant: '', url: '', imageUrl: '', price: '', currency, quantity: 1, priority: 0, note: '', ...partial };
}

/** Fetch name, photo and price for a link through our server. */
export async function unfurl(url: string): Promise<{ values: Partial<ItemFormValues>; variants: ProductVariant[]; partial: boolean } | { error: string }> {
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
    variants: Array.isArray(data.variants) ? data.variants : [],
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
  initialVariants = [],
  mode,
  onSave,
  onCancel,
}: {
  initial: ItemFormValues;
  initialVariants?: ProductVariant[];
  mode: 'add' | 'edit';
  /** One entry per wish to save: several when several versions are picked. */
  onSave: (values: ItemFormValues[]) => Promise<boolean>;
  onCancel: () => void;
}) {
  const firstPick =
    initial.variant && initialVariants.some((v) => v.name === initial.variant)
      ? initial.variant
      : initialVariants[0] && mode === 'add'
        ? initialVariants[0].name
        : null;
  // Open on the picked version's own photo, price and link.
  const [values, setValues] = useState<ItemFormValues>(() => {
    const v = initialVariants.find((x) => x.name === firstPick);
    if (!v || mode !== 'add') return initial;
    return {
      ...initial,
      variant: v.name,
      imageUrl: v.imageUrl || initial.imageUrl,
      price: v.price !== null ? String(v.price) : initial.price,
      currency: v.currency || initial.currency,
      url: v.url || initial.url,
    };
  });
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants);
  const [picked, setPicked] = useState<string[]>(firstPick ? [firstPick] : []);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [hint, setHint] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadDropped = async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file, 'item');
      setValues((v) => ({ ...v, imageUrl: url }));
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };
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
    setVariants(result.variants);
    if (result.variants[0]) pickVariants([result.variants[0].name], result.variants);
    if (result.partial) setHint('That store didn’t share its details with us. Fill them in, or use the bookmarklet on the product page.');
  };

  /** Picking one version shows its own photo, price and link. */
  const pickVariants = (names: string[], list: ProductVariant[] = variants) => {
    setPicked(names);
    const only = names.length === 1 ? list.find((v) => v.name === names[0]) : null;
    if (only) {
      setValues((v) => ({
        ...v,
        variant: only.name,
        imageUrl: only.imageUrl || v.imageUrl,
        price: only.price !== null ? String(only.price) : v.price,
        currency: only.currency || v.currency,
        url: only.url || v.url,
      }));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const chosen = variants.filter((v) => picked.includes(v.name));
    const list =
      chosen.length > 1
        ? chosen.map((v) => ({
            ...values,
            variant: v.name,
            imageUrl: v.imageUrl || values.imageUrl,
            price: v.price !== null ? String(v.price) : values.price,
            currency: v.currency || values.currency,
            url: v.url || values.url,
          }))
        : [{ ...values, variant: chosen[0]?.name ?? values.variant }];
    const ok = await onSave(list);
    if (!ok) setBusy(false);
  };

  const onPriceBlur = () => {
    const guessed = currencyFromSymbol(values.price, hostOf(values.url));
    if (guessed && DISPLAY_CURRENCIES.includes(guessed)) set('currency', guessed);
  };

  return (
    <form
      onSubmit={submit}
      className="p-5 sm:p-6 space-y-4"
      onPaste={(e) => {
        const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
        if (file) {
          e.preventDefault();
          void uploadDropped(file);
        }
      }}
    >
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
        <div
          className={`aspect-square rounded-[4px] overflow-hidden border bg-[#f4f4f6] transition ${dragging ? 'border-[var(--color-violet)] ring-2 ring-[var(--color-violet)]/40' : 'border-[var(--color-line)]'}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void uploadDropped(e.dataTransfer.files?.[0]);
          }}
          title="Drop a photo here"
        >
          {uploading ? (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-raised)]"><span className="spinner" /></div>
          ) : (
            <ItemImage src={values.imageUrl || null} alt="" store={hostOf(values.url)} className="w-full h-full object-contain p-1.5" />
          )}
        </div>
        <div>
          <label className="field-label" htmlFor="item-title">Name</label>
          <input id="item-title" className="field" required maxLength={200} placeholder="What do you wish for?" value={values.title} onChange={(e) => set('title', e.target.value)} autoFocus={mode === 'add' && !values.title} />
        </div>
      </div>

      {variants.length > 1 ? (
        <VariantPicker variants={variants} selected={picked} onChange={(names) => pickVariants(names)} multiple={mode === 'add'} />
      ) : (
        <div>
          <label className="field-label" htmlFor="item-variant">Version <span className="dim font-normal">(optional)</span></label>
          <input id="item-variant" className="field" maxLength={80} placeholder="Size, colour, character…" value={values.variant} onChange={(e) => set('variant', e.target.value)} />
        </div>
      )}

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
        <label className="field-label" htmlFor="item-image">Photo</label>
        <div className="flex gap-2">
          <input id="item-image" className="field" type="url" placeholder="Paste an image link, or upload one" value={values.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
          <UploadButton kind="item" className="btn btn-ghost shrink-0 !h-[44px]" onUploaded={(url) => set('imageUrl', url)} />
        </div>
        <p className="field-note">You can also drop or paste an image onto this form.</p>
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
          {busy ? <span className="spinner" /> : null}{' '}
          {mode === 'add' ? (picked.length > 1 && variants.length > 1 ? `Add ${picked.length} wishes` : 'Add to wishlist') : 'Save'}
        </button>
      </div>
    </form>
  );
}
