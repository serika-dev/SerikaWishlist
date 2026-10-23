import { cache } from 'react';
import { cookies } from 'next/headers';
import { getSessionUser } from './auth';
import { config, isProduction } from './config';
import { AuthError } from './errors';
import { getCurrentGuest } from './guest';
import { canEdit, getListById, type Owner } from './lists';
import { randomToken } from './tokens';
import type { Viewer, Wishlist } from './types';

export const getViewer = cache(async (): Promise<Viewer> => {
  const [user, guest] = await Promise.all([getSessionUser(), getCurrentGuest()]);
  return { user, guest };
});

/** Where new lists go: the account if signed in, otherwise the guest (if any). */
export function ownerOf(viewer: Viewer): Owner | null {
  if (viewer.user) return { userId: viewer.user.id };
  if (viewer.guest && !viewer.guest.claimedUserId) return { guestId: viewer.guest.id };
  return null;
}

/** Load a list the viewer may edit, or throw a 404/403-shaped error. */
export async function requireEditableList(id: string): Promise<{ list: Wishlist; viewer: Viewer }> {
  const [list, viewer] = await Promise.all([getListById(id), getViewer()]);
  if (!list) throw new AuthError('That wishlist does not exist.', 404);
  if (!canEdit(list, viewer)) throw new AuthError('Only the owner can change this wishlist.', 403);
  return { list, viewer };
}

/**
 * Anonymous id for gift-givers, so the browser that reserved an item can undo
 * it. It carries no identity and is never shown to the list owner.
 */
export async function gifterId(create: boolean): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(config.GIFTER_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
  if (!create) return null;
  const id = randomToken(18);
  store.set(config.GIFTER_COOKIE, id, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  });
  return id;
}
