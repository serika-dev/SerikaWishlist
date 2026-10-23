'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, Check, ExternalLink, Star } from 'lucide-react';
import { ImportReview, type ImportPayload } from '@/components/import/ImportReview';
import { ItemImage } from '@/components/wishlist/ItemImage';
import { unfurl } from '@/components/wishlist/ItemEditor';
import { cleanPrice, COMMON_CURRENCIES, currencyFromSymbol } from '@/lib/currency';
import { hostOf } from '@/lib/format';
import type { ItemDraft } from '@/lib/types';
import { Wordmark } from './Wordmark';

/**
 * The bookmarklet's popup. The store page posts what it read
 * ({ kind: 'product' | 'import' }); this shows it for the person to check,
 * then saves through the normal API with their own cookies.
 */

interface ListOption {
  id: string;
  slug: string;
  title: string;
  emoji: string;
}

interface ProductDraft {
  title: string;
  url: string;
  imageUrl: string;
  price: string;
  currency: string;
  note: string;
  priority: number;
}

type Phase =
  | { name: 'waiting' }
  | { name: 'help' }
  | { name: 'product'; draft: ProductDraft }
  | { name: 'import'; imported: ImportPayload }
  | { name: 'loading'; message: string }
  | { name: 'done'; slug: string; title: string; count: number }
  | { name: 'error'; message: string };

const STORAGE_KEY = 'serika-wishlist:clip';

function str(value: unknown, max = 2048): string {
  return typeof value === 'string' ? value.slice(0, max) : typeof value === 'number' ? String(value) : '';
}

function toDraft(product: Record<string, unknown>): ProductDraft {
  const price = str(product.price, 40);
  const url = str(product.url);
  const currency = str(product.currency, 3).toUpperCase() || currencyFromSymbol(price, hostOf(url)) || '';
  return {
    title: str(product.title, 200).trim(),
    url,
    imageUrl: str(product.imageUrl),
    price: price.replace(/[^\d.,]/g, ''),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'EUR',
    note: str(product.note, 1000),
    priority: 0,
  };
}

function toItems(raw: unknown): ItemDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 500)
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .map((x) => ({
      title: str(x.title, 200).trim(),
      url: str(x.url) || null,
      imageUrl: str(x.imageUrl) || null,
      price: cleanPrice(x.price),
      currency: str(x.currency, 3) || null,
      store: str(x.store, 80) || null,
      note: str(x.note, 1000),
      quantity: Number(x.quantity) || 1,
      priority: Number(x.priority) > 0 ? 1 : 0,
    }))
    .filter((x) => x.title);
}

export function ClipApp({ fallbackUrl }: { fallbackUrl: string | null }) {
  const [phase, setPhase] = useState<Phase>({ name: 'waiting' });
  const [lists, setLists] = useState<ListOption[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [target, setTarget] = useState('');
  const [newTitle, setNewTitle] = useState('My wishlist');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const received = useRef(false);

  const accept = useCallback(async (payload: Record<string, unknown>) => {
    if (received.current) return;
    received.current = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    if (payload.kind === 'product' && payload.product && typeof payload.product === 'object') {
      const draft = toDraft(payload.product as Record<string, unknown>);
      // Pages that hide their details from scripts: let the server have a go too.
      if (!draft.title || !draft.imageUrl) {
        const more = draft.url ? await unfurl(draft.url) : null;
        if (more && !('error' in more)) {
          draft.title ||= more.values.title || '';
          draft.imageUrl ||= more.values.imageUrl || '';
          draft.price ||= more.values.price || '';
        }
      }
      setPhase({ name: 'product', draft });
      return;
    }

    if (payload.kind === 'import') {
      const source = str(payload.source, 20) || 'page';
      const url = str(payload.url);
      setPhase({ name: 'loading', message: 'Reading the whole list…' });
      // MyWishlist and Throne read better on the server (real store links, full data).
      if ((source === 'mywishlist' || source === 'throne') && url) {
        try {
          const response = await fetch('/api/import/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          const data = await response.json();
          if (response.ok && data.list) {
            setPhase({ name: 'import', imported: data.list });
            return;
          }
        } catch {}
      }
      const items = toItems(payload.items);
      if (items.length === 0) {
        setPhase({ name: 'error', message: 'No wishes found on this page. Scroll so the list has loaded, then click the bookmarklet again.' });
        return;
      }
      setPhase({
        name: 'import',
        imported: { source, sourceUrl: url, title: str(payload.title, 80) || 'Imported wishlist', items },
      });
      return;
    }
    setPhase({ name: 'error', message: 'This page sent something we don’t understand.' });
  }, []);

  // Where the data comes from: a restored session (after signing in), ?u=<link>, or the opener.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        void accept(JSON.parse(saved));
        return;
      }
    } catch {}

    if (fallbackUrl) {
      setPhase({ name: 'loading', message: 'Reading the product…' });
      void unfurl(fallbackUrl).then((result) => {
        received.current = true;
        if ('error' in result) setPhase({ name: 'error', message: result.error });
        else setPhase({ name: 'product', draft: toDraft({ ...result.values, url: fallbackUrl }) });
      });
      return;
    }

    const opener = window.opener as Window | null;
    if (!opener) {
      setPhase({ name: 'help' });
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== opener || !event.data || event.data.type !== 'serika-wishlist:payload') return;
      try {
        opener.postMessage({ type: 'serika-wishlist:got' }, event.origin);
      } catch {}
      void accept(event.data.payload ?? {});
    };
    window.addEventListener('message', onMessage);
    const ping = () => {
      try {
        opener.postMessage({ type: 'serika-wishlist:ready' }, '*');
      } catch {}
    };
    ping();
    const interval = setInterval(() => !received.current && ping(), 400);
    const giveUp = setTimeout(() => !received.current && setPhase({ name: 'help' }), 9000);
    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(interval);
      clearTimeout(giveUp);
    };
  }, [accept, fallbackUrl]);

  useEffect(() => {
    fetch('/api/lists')
      .then((r) => r.json())
      .then((data) => {
        const options: ListOption[] = (data.lists || []).map((l: ListOption) => ({ id: l.id, slug: l.slug, title: l.title, emoji: l.emoji }));
        setLists(options);
        setSignedIn(Boolean(data.signedIn));
        setTarget((t) => t || options[0]?.id || 'new');
      })
      .catch(() => setTarget('new'));
  }, []);

  const finish = (slug: string, title: string, count: number) => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setPhase({ name: 'done', slug, title, count });
  };

  const addProduct = async (draft: ProductDraft) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      let listId = target;
      let list = lists.find((l) => l.id === target);
      if (target === 'new' || !list) {
        const response = await fetch('/api/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle || 'My wishlist' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not create the wishlist.');
        list = data.list as ListOption;
        listId = list.id;
      }
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { ...draft, price: draft.price || null } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add it.');
      finish(list.slug, list.title, 1);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const signInHref = `/login?${new URLSearchParams({ next: '/clip' })}`;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="h-14 px-4 flex items-center border-b border-[var(--color-line)] bg-black/40 backdrop-blur sticky top-0 z-10">
        <Wordmark size={18} href={null} />
        {signedIn === false && (
          <Link href={signInHref} className="ml-auto text-[12.5px] text-[var(--color-violet-lift)] hover:underline">
            Sign in
          </Link>
        )}
      </header>

      <main className="flex-1 p-4 sm:p-5">
        {phase.name === 'waiting' && (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <span className="spinner !w-7 !h-7" />
            <p className="muted text-[14px]">Reading the page…</p>
          </div>
        )}

        {phase.name === 'loading' && (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <span className="spinner !w-7 !h-7" />
            <p className="muted text-[14px]">{phase.message}</p>
          </div>
        )}

        {phase.name === 'help' && (
          <div className="py-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-[4px] bg-[var(--color-night)] flex items-center justify-center text-[var(--color-violet-lift)]">
              <Bookmark size={26} />
            </div>
            <h1 className="display text-[26px] mt-5">Open me from a store</h1>
            <p className="muted text-[14px] mt-2 max-w-xs mx-auto">
              This window is the Serika Wishlist bookmarklet. Go to a product page and click the bookmark there.
            </p>
            <a href="/bookmarklet" target="_blank" className="btn btn-ghost mt-6">Get the bookmarklet</a>
          </div>
        )}

        {phase.name === 'error' && (
          <div className="py-12 text-center">
            <p className="text-4xl">🫥</p>
            <p className="mt-4 muted text-[14px]">{phase.message}</p>
            <button type="button" className="btn btn-ghost mt-6" onClick={() => window.close()}>Close</button>
          </div>
        )}

        {phase.name === 'product' && (
          <form
            className="space-y-4 enter"
            onSubmit={(e) => {
              e.preventDefault();
              void addProduct(phase.draft);
            }}
          >
            <div className="card corner overflow-hidden">
              <div className="aspect-[4/3] bg-[#f4f4f6]">
                <ItemImage src={phase.draft.imageUrl || null} alt="" store={hostOf(phase.draft.url)} className="w-full h-full object-contain p-[6%]" />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] dim truncate">{hostOf(phase.draft.url)}</p>
                <textarea
                  className="field mt-2 !min-h-[64px] font-semibold"
                  rows={2}
                  maxLength={200}
                  required
                  placeholder="Name"
                  value={phase.draft.title}
                  onChange={(e) => setPhase({ ...phase, draft: { ...phase.draft, title: e.target.value } })}
                />
                <div className="mt-3 grid grid-cols-[1fr_96px] gap-2">
                  <input className="field tnum" inputMode="decimal" placeholder="Price" value={phase.draft.price} onChange={(e) => setPhase({ ...phase, draft: { ...phase.draft, price: e.target.value } })} />
                  <select className="field" value={phase.draft.currency} onChange={(e) => setPhase({ ...phase, draft: { ...phase.draft, currency: e.target.value } })}>
                    {[...new Set([phase.draft.currency, ...COMMON_CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <input className="field mt-2" placeholder="Note: size, colour… (optional)" maxLength={1000} value={phase.draft.note} onChange={(e) => setPhase({ ...phase, draft: { ...phase.draft, note: e.target.value } })} />
                <button
                  type="button"
                  className={`mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold ${phase.draft.priority ? 'text-[var(--color-violet-lift)]' : 'dim hover:text-white'}`}
                  onClick={() => setPhase({ ...phase, draft: { ...phase.draft, priority: phase.draft.priority ? 0 : 1 } })}
                >
                  <Star size={14} fill={phase.draft.priority ? 'currentColor' : 'none'} /> Most wanted
                </button>
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="clip-target">Add to</label>
              <select id="clip-target" className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.emoji} {l.title}</option>)}
                <option value="new">＋ New wishlist…</option>
              </select>
              {target === 'new' && (
                <input className="field mt-2" maxLength={80} placeholder="Name your new wishlist" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              )}
            </div>

            {error && <p className="text-[13px] text-[var(--color-bad)]" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy || !phase.draft.title.trim()}>
              {busy ? <span className="spinner" /> : null} Add to wishlist
            </button>
            {signedIn === false && (
              <p className="text-[12px] dim text-center">
                Saving as a guest on this device. <Link href={signInHref} className="text-[var(--color-violet-lift)] hover:underline">Sign in</Link> to save to your Serika account.
              </p>
            )}
          </form>
        )}

        {phase.name === 'import' && (
          <div className="enter">
            <h1 className="display text-[24px] mb-4">Import this list</h1>
            <ImportReview
              compact
              imported={phase.imported}
              lists={lists}
              onImported={({ slug, title, added }) => finish(slug, title, added)}
            />
          </div>
        )}

        {phase.name === 'done' && (
          <div className="py-12 text-center enter">
            <div className="mx-auto h-16 w-16 rounded-full bg-[var(--color-violet)] flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.7)]">
              <Check size={32} strokeWidth={3} />
            </div>
            <h1 className="display text-[28px] mt-6">
              {phase.count === 1 ? 'Wished for' : `${phase.count} wishes added`}
            </h1>
            <p className="muted mt-2">Added to <b className="text-white">{phase.title}</b>.</p>
            <div className="mt-8 flex flex-col gap-2 max-w-[260px] mx-auto">
              <a href={`/w/${phase.slug}`} target="_blank" rel="noreferrer" className="btn btn-primary">
                View wishlist <ExternalLink size={15} />
              </a>
              <button type="button" className="btn btn-bare" onClick={() => window.close()}>Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
