'use client';

import { useMemo, useState } from 'react';
import { Check, Import } from 'lucide-react';
import { ItemImage } from '@/components/wishlist/ItemImage';
import { formatMoney, hostOf } from '@/lib/format';
import type { ItemDraft, Wishlist } from '@/lib/types';

export interface ImportPayload {
  source: string;
  sourceUrl: string;
  title: string;
  description?: string;
  ownerName?: string | null;
  items: ItemDraft[];
  related?: { title: string; url: string }[];
}

const LABEL: Record<string, string> = { throne: 'Throne', mywishlist: 'MyWishlist', wishlistcom: 'Wishlist.com', page: 'the web' };

/** Pick what to bring over and where to put it, then save. */
export function ImportReview({
  imported,
  lists,
  defaultTarget = 'new',
  compact = false,
  onImported,
  onRelated,
}: {
  imported: ImportPayload;
  lists: Pick<Wishlist, 'id' | 'title' | 'emoji'>[];
  defaultTarget?: string;
  compact?: boolean;
  onImported: (result: { slug: string; title: string; added: number }) => void;
  onRelated?: (url: string) => void;
}) {
  const [title, setTitle] = useState(imported.title);
  const [target, setTarget] = useState(lists.some((l) => l.id === defaultTarget) ? defaultTarget : 'new');
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const chosen = useMemo(() => imported.items.filter((_, i) => !skipped.has(i)), [imported.items, skipped]);

  const toggle = (index: number) =>
    setSkipped((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const commit = async () => {
    if (busy || chosen.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: imported.description || '',
          source: imported.source,
          sourceUrl: imported.sourceUrl,
          items: chosen,
          intoListId: target === 'new' ? undefined : target,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed.');
      onImported({ slug: data.list.slug, title: data.list.title, added: data.added });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-violet">From {LABEL[imported.source] ?? imported.source}</span>
        {imported.ownerName && <span className="chip">By {imported.ownerName}</span>}
        <span className="chip">{imported.items.length} found</span>
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? '' : 'sm:grid-cols-[1fr_260px]'}`}>
        <div>
          <label className="field-label" htmlFor="import-target">Add to</label>
          <select id="import-target" className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="new">A new wishlist</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.emoji} {l.title}
              </option>
            ))}
          </select>
        </div>
        {target === 'new' && (
          <div className={compact ? '' : 'sm:order-first'}>
            <label className="field-label" htmlFor="import-title">New wishlist name</label>
            <input id="import-title" className="field" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-[12.5px]">
        <span className="dim">{chosen.length} of {imported.items.length} selected</span>
        <span className="flex gap-3">
          <button type="button" className="text-[var(--color-violet-lift)] hover:underline" onClick={() => setSkipped(new Set())}>All</button>
          <button type="button" className="text-[var(--color-violet-lift)] hover:underline" onClick={() => setSkipped(new Set(imported.items.map((_, i) => i)))}>None</button>
        </span>
      </div>

      <ul className={`mt-2 grid gap-2 ${compact ? 'max-h-[46dvh]' : 'max-h-[60vh] sm:grid-cols-2'} overflow-y-auto pr-1`}>
        {imported.items.map((item, index) => {
          const on = !skipped.has(index);
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={on}
                className={`w-full flex items-center gap-3 text-left p-2 rounded-[4px] border transition ${on ? 'border-[var(--color-violet)]/50 bg-[var(--color-violet)]/[0.06]' : 'border-[var(--color-line)] opacity-45'}`}
              >
                <span className="relative h-14 w-14 shrink-0 rounded-[3px] overflow-hidden bg-[#f4f4f6]">
                  <ItemImage src={item.imageUrl ?? null} alt="" store={item.store ?? hostOf(item.url)} className="w-full h-full object-contain p-1" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug clamp-2">{item.title}</span>
                  <span className="block text-[11.5px] dim mt-0.5 truncate">
                    {item.price !== null && item.price !== undefined ? <b className="text-[var(--color-violet-lift)]">{formatMoney(Number(item.price), item.currency)}</b> : 'No price'}
                    {(item.store || hostOf(item.url)) && <> · {item.store || hostOf(item.url)}</>}
                  </span>
                </span>
                <span className={`h-5 w-5 shrink-0 rounded-[3px] border flex items-center justify-center ${on ? 'bg-[var(--color-violet)] border-[var(--color-violet)]' : 'border-[var(--color-line-strong)]'}`}>
                  {on && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-4 text-[13px] text-[var(--color-bad)]" role="alert">{error}</p>}

      <button type="button" className="btn btn-primary btn-lg w-full mt-5" onClick={commit} disabled={busy || chosen.length === 0}>
        {busy ? <span className="spinner" /> : <Import size={17} />} Import {chosen.length} {chosen.length === 1 ? 'wish' : 'wishes'}
      </button>

      {imported.related && imported.related.length > 0 && onRelated && (
        <div className="mt-6 pt-5 border-t border-[var(--color-line)]">
          <p className="text-[13px] muted">More lists from the same person on {LABEL[imported.source]}:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {imported.related.map((r) => (
              <button key={r.url} type="button" className="btn btn-ghost btn-sm" onClick={() => onRelated(r.url)}>
                {r.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
