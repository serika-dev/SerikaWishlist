import type { Metadata } from 'next';
import { ImportFlow } from '@/components/import/ImportFlow';
import { bookmarkletCode } from '@/lib/bookmarklet';
import { config } from '@/lib/config';
import { listsForViewer } from '@/lib/lists';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Import a wishlist' };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ into?: string; url?: string }> }) {
  const { into, url } = await searchParams;
  const lists = await listsForViewer(await getViewer());
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 sm:pt-14">
      <p className="eyebrow">Import</p>
      <h1 className="display text-[40px] sm:text-[60px] mt-2">
        Bring your <span className="text-[var(--color-violet)]">wishlist</span>
      </h1>
      <p className="mt-4 max-w-2xl muted">
        Moving from Throne, MyWishlist or Wishlist.com? Paste the link and every wish comes along. Your old list stays
        where it is.
      </p>
      <div className="mt-10">
        <ImportFlow
          lists={lists.map((l) => ({ id: l.id, title: l.title, emoji: l.emoji }))}
          defaultTarget={typeof into === 'string' ? into : undefined}
          bookmarklet={bookmarkletCode(config.BASE_URL)}
          initialUrl={typeof url === 'string' ? url.slice(0, 2048) : ''}
        />
      </div>
    </div>
  );
}
