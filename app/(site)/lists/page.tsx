import type { Metadata } from 'next';
import Link from 'next/link';
import { Bookmark, Import } from 'lucide-react';
import { GuestBanner } from '@/components/GuestBanner';
import { ListCard } from '@/components/ListCard';
import { NewListButton } from '@/components/NewListButton';
import { displayName } from '@/lib/format';
import { listsForViewer } from '@/lib/lists';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My wishlists' };

export default async function ListsPage() {
  const viewer = await getViewer();
  const guest = viewer.guest && !viewer.guest.claimedUserId ? viewer.guest : null;
  const lists = await listsForViewer(viewer);

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 sm:pt-14">
      <header className="flex flex-col sm:flex-row sm:items-end gap-5 justify-between">
        <div>
          <p className="eyebrow">{viewer.user ? `@${viewer.user.username}` : guest ? 'Guest' : 'Serika Wishlist'}</p>
          <h1 className="display text-[40px] sm:text-[56px] mt-2">
            {viewer.user ? (
              <>
                {displayName(viewer.user)}’s <span className="text-[var(--color-violet)]">wishlists</span>
              </>
            ) : (
              <>
                My <span className="text-[var(--color-violet)]">wishlists</span>
              </>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/import" className="btn btn-ghost">
            <Import size={16} /> Import
          </Link>
          <NewListButton />
        </div>
      </header>

      {!viewer.user && guest && lists.length > 0 && (
        <div className="mt-8">
          <GuestBanner guest={guest} />
        </div>
      )}

      {lists.length === 0 ? (
        <div className="mt-12 card corner p-10 sm:p-16 text-center">
          <div className="text-6xl">🎁</div>
          <h2 className="display text-[30px] mt-5">Nothing wished for yet</h2>
          <p className="muted mt-3 max-w-md mx-auto">
            Start a list, import one from Throne, MyWishlist or Wishlist.com, or grab the bookmarklet and add things
            while you shop.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <NewListButton label="Start a wishlist" />
            <Link href="/import" className="btn btn-ghost"><Import size={16} /> Import</Link>
            <Link href="/bookmarklet" className="btn btn-ghost"><Bookmark size={16} /> Bookmarklet</Link>
          </div>
          {!viewer.user && !guest && (
            <p className="mt-8 text-[13px] dim">
              Made lists before? <Link href="/access" className="text-[var(--color-violet-lift)] hover:underline">Get them back by email</Link> or{' '}
              <Link href="/login?next=/lists" className="text-[var(--color-violet-lift)] hover:underline">sign in</Link>.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-10 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
