import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GuestBanner } from '@/components/GuestBanner';
import { WishlistView } from '@/components/wishlist/WishlistView';
import { config } from '@/lib/config';
import { displayName, plural } from '@/lib/format';
import { canEdit, canView, getListBySlug, listItems } from '@/lib/lists';
import { getPublicUser } from '@/lib/owners';
import { shareUrl } from '@/lib/urls';
import { getViewer, gifterId } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list || list.visibility === 'private' || list.visibility === 'friends') return { title: 'Wishlist', robots: { index: false } };
  const owner = list.ownerUserId ? await getPublicUser({ id: list.ownerUserId }) : null;
  const title = owner ? `${list.title} · ${displayName(owner)}` : list.title;
  const description = list.description || `${plural(list.itemCount ?? 0, 'wish', 'wishes')} on Serika Wishlist.`;
  return {
    title,
    description,
    robots: list.visibility === 'public' ? undefined : { index: false },
    openGraph: { title, description, images: list.previewImages?.slice(0, 1) },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function WishlistPage({ params }: Props) {
  const { slug } = await params;
  const [list, viewer] = await Promise.all([getListBySlug(slug), getViewer()]);
  if (!list || !(await canView(list, viewer))) notFound();

  const isOwner = canEdit(list, viewer);
  const [items, owner] = await Promise.all([
    listItems(list.id, { revealReservations: !isOwner || list.showReservations, gifterId: await gifterId(false) }),
    list.ownerUserId ? getPublicUser({ id: list.ownerUserId }) : null,
  ]);

  const guest = viewer.guest;
  const guestNotice = isOwner && !viewer.user && guest && !guest.email ? <GuestBanner guest={guest} returnTo={`/w/${list.slug}`} /> : undefined;

  return (
    <Suspense>
      <WishlistView
        list={list}
        items={items}
        isOwner={isOwner}
        owner={owner}
        shareUrl={shareUrl(list.slug)}
        mainUrl={`${config.BASE_URL}/w/${list.slug}`}
        canBePublic={Boolean(list.ownerUserId)}
        guestNotice={guestNotice}
      />
    </Suspense>
  );
}
