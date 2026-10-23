import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { FriendsPanel } from '@/components/FriendsPanel';
import { ListCard } from '@/components/ListCard';
import { displayName } from '@/lib/format';
import { friendOverview } from '@/lib/friends';
import { friendsFeed } from '@/lib/lists';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Friends' };

export default async function FriendsPage() {
  const { user } = await getViewer();

  if (!user) {
    return (
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 pt-16 text-center">
        <p className="text-6xl">💜</p>
        <h1 className="display text-[40px] sm:text-[52px] mt-5">Wish with <span className="text-[var(--color-violet)]">friends</span></h1>
        <p className="muted mt-4">
          Friends are your Serika friends, the same ones you have on SerikaCord. Sign in to see their wishlists and share
          lists only they can open.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <Link href="/login?next=/friends" className="btn btn-primary btn-lg">Sign in with Serika</Link>
        </div>
      </div>
    );
  }

  const [overview, feed] = await Promise.all([friendOverview(user.id), friendsFeed(user.id)]);

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 sm:pt-14">
      <p className="eyebrow">Synced with your Serika account</p>
      <h1 className="display text-[40px] sm:text-[58px] mt-2">
        Friends’ <span className="text-[var(--color-violet)]">wishes</span>
      </h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] items-start">
        <div>
          {feed.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-5xl">🎁</p>
              <p className="mt-4 font-bold">No lists from friends yet</p>
              <p className="mt-1 text-[13.5px] muted">When your friends share wishlists as Public or Friends, they show up here.</p>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {feed.map((list) => (
                <div key={list.id} className="flex flex-col gap-2">
                  <Link href={`/u/${encodeURIComponent(list.owner.username)}`} className="flex items-center gap-2 text-[13px] muted hover:text-white">
                    <Avatar user={list.owner} size={22} /> {displayName(list.owner)}
                  </Link>
                  <ListCard list={list} showVisibility={false} />
                </div>
              ))}
            </div>
          )}
        </div>
        <FriendsPanel {...overview} />
      </div>
    </div>
  );
}
