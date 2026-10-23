'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, MousePointerClick } from 'lucide-react';
import { BookmarkletLink } from '@/components/BookmarkletLink';
import { useToast } from '@/components/Toaster';
import type { Wishlist } from '@/lib/types';
import { ImportReview, type ImportPayload } from './ImportReview';

const SOURCES = [
  { name: 'Throne', example: 'throne.com/yourname' },
  { name: 'MyWishlist', example: 'mywishlist.online/w/abc123/…' },
  { name: 'Wishlist.com', example: 'wishlist.com/…' },
];

export function ImportFlow({
  lists,
  defaultTarget,
  bookmarklet,
  initialUrl = '',
}: {
  lists: Pick<Wishlist, 'id' | 'title' | 'emoji'>[];
  defaultTarget?: string;
  bookmarklet: string;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsBrowser, setNeedsBrowser] = useState<{ label: string; message: string } | null>(null);
  const [imported, setImported] = useState<ImportPayload | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const preview = async (target: string) => {
    if (!target.trim() || busy) return;
    setBusy(true);
    setError('');
    setNeedsBrowser(null);
    setImported(null);
    try {
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not read that list.');
      if (data.needsBrowser) setNeedsBrowser({ label: data.label, message: data.message });
      else setImported(data.list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialUrl) void preview(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px] items-start">
      <div className="card corner p-5 sm:p-7 glow-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void preview(url);
          }}
        >
          <label className="field-label" htmlFor="import-url">Link to your list</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="import-url" className="field !h-12" type="text" inputMode="url" placeholder="https://throne.com/yourname" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
            <button type="submit" className="btn btn-primary !h-12 shrink-0" disabled={busy || !url.trim()}>
              {busy ? <span className="spinner" /> : <ArrowRight size={17} />} Read list
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <span key={s.name} className="chip" title={s.example}>{s.name}</span>
            ))}
          </div>
        </form>

        {busy && (
          <div className="mt-7 space-y-2" aria-live="polite">
            <p className="text-[13px] muted">Reading the list and following every store link…</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[74px] rounded-[4px]" />)}
            </div>
          </div>
        )}

        {error && <p className="mt-5 text-[13.5px] text-[var(--color-bad)]" role="alert">{error}</p>}

        {needsBrowser && (
          <div className="mt-7 rounded-[4px] border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/[0.06] p-5">
            <p className="font-bold flex items-center gap-2"><MousePointerClick size={18} /> {needsBrowser.label} needs your browser for this one</p>
            <p className="text-[13.5px] muted mt-1.5">
              {needsBrowser.message} No problem: drag the button below to your bookmarks bar, open your list on {needsBrowser.label}, and click it there. It reads the list right from the page.
            </p>
            <div className="mt-4"><BookmarkletLink code={bookmarklet} size="sm" /></div>
          </div>
        )}

        {imported && (
          <div className="mt-7 pt-7 border-t border-[var(--color-line)]">
            <ImportReview
              imported={imported}
              lists={lists}
              defaultTarget={defaultTarget}
              onImported={({ slug, added }) => {
                toast(`Imported ${added} ${added === 1 ? 'wish' : 'wishes'}.`, 'success');
                router.push(`/w/${slug}`);
                router.refresh();
              }}
              onRelated={(next) => {
                setUrl(next);
                void preview(next);
              }}
            />
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <p className="eyebrow">How it works</p>
          <ol className="mt-3 space-y-3 text-[13.5px] muted list-decimal pl-4">
            <li>Copy the link to your list on Throne, MyWishlist or Wishlist.com. It has to be visible to anyone with the link.</li>
            <li>Paste it here. We read every wish: name, photo, price, note and store link.</li>
            <li>Pick what to bring over, then import into a new list or one you already have.</li>
          </ol>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Behind a bot check?</p>
          <p className="mt-2 text-[13.5px] muted">
            Some sites only open for real browsers. Use the bookmarklet on your list page instead, it reads the list straight from your screen.
          </p>
          <div className="mt-4"><BookmarkletLink code={bookmarklet} size="sm" /></div>
        </div>
      </aside>
    </div>
  );
}
