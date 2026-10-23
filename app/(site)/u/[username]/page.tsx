import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { FriendButton } from '@/components/FriendButton';
import { ListCard } from '@/components/ListCard';
import { displayName } from '@/lib/format';
import { friendState } from '@/lib/friends';
import { profileListsForUser } from '@/lib/lists';
import { getPublicUser } from '@/lib/owners';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getPublicUser({ username: decodeURIComponent((await params).username) });
  return { title: user ? `${displayName(user)}’s wishlists` : 'Wishlists' };
}

export default async function ProfilePage({ params }: Props) {
  const user = await getPublicUser({ username: decodeURIComponent((await params).username) });
  if (!user) notFound();
  const viewer = await getViewer();
  const state = await friendState(viewer.user?.id, user.id);
  const isSelf = state === 'self';
  const lists = await profileListsForUser(user.id, { includeFriends: isSelf || state === 'friends' });

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-12 sm:pt-16">
      <header className="flex items-center gap-5">
        <Avatar user={user} size={84} className="ring-4 ring-[var(--color-violet)]/30" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">@{user.username}{state === 'friends' ? ' · Friend' : ''}</p>
          <h1 className="display text-[36px] sm:text-[52px] mt-1 truncate">
            {displayName(user)}’s <span className="text-[var(--color-violet)]">wishes</span>
          </h1>
          {viewer.user && !isSelf && (
            <div className="mt-3">
              <FriendButton userId={user.id} initial={state} name={displayName(user)} />
            </div>
          )}
        </div>
      </header>
      {lists.length === 0 ? (
        <div className="mt-12 card p-10 text-center">
          <p className="text-4xl">🌙</p>
          <p className="mt-3 muted">
            {isSelf
              ? 'None of your wishlists are public or friends-only yet. Change who can see a list in its settings.'
              : `${displayName(user)} hasn’t shared any wishlists${state === 'friends' ? '' : ' publicly'} yet.`}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} showVisibility={false} />
          ))}
        </div>
      )}
    </div>
  );
}
