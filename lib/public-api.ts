import { listItems, publicListsForUser } from './lists';
import { getPublicUser, type PublicUser } from './owners';
import { profileUrl, shareUrl } from './urls';
import type { Wishlist } from './types';

/**
 * The read-only public API behind the SerikaCord profile widget (and anyone
 * else who wants to show a wishlist). Only lists their owners made Public, or
 * that are fetched by their link-only slug, ever come out of here, and never
 * reservation details.
 */

export const PUBLIC_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
};

export function publicJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: PUBLIC_HEADERS });
}

export function itemLimit(request: Request, fallback: number): number {
  const n = Number(new URL(request.url).searchParams.get('items'));
  return Number.isFinite(n) && n >= 0 ? Math.min(48, Math.floor(n)) : fallback;
}

export async function serializeList(list: Wishlist, items: number) {
  const all = items > 0 ? await listItems(list.id, { revealReservations: false }) : [];
  return {
    slug: list.slug,
    title: list.title,
    emoji: list.emoji,
    iconUrl: list.iconUrl,
    description: list.description,
    url: shareUrl(list.slug),
    itemCount: list.itemCount ?? all.length,
    totalValue: list.totalValue ?? null,
    updatedAt: list.updatedAt,
    items: all.slice(0, items).map((item) => ({
      title: item.title,
      imageUrl: item.imageUrl,
      price: item.price,
      currency: item.currency,
      url: item.url,
      store: item.store,
      priority: item.priority,
      received: Boolean(item.receivedAt),
    })),
  };
}

export function serializeUser(user: PublicUser) {
  return { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar };
}

export async function userWishlistsResponse(user: PublicUser | null, request: Request): Promise<Response> {
  if (!user) return publicJson({ error: 'This person has no Serika Wishlist yet.' }, 404);
  const lists = await publicListsForUser(user.id);
  const items = itemLimit(request, 6);
  return publicJson({
    user: serializeUser(user),
    profileUrl: profileUrl(user.username),
    lists: await Promise.all(lists.map((list) => serializeList(list, items))),
  });
}

export async function findUser(by: { id?: string; username?: string }) {
  return getPublicUser(by);
}
