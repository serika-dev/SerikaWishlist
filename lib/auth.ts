import { cache } from 'react';
import { cookies } from 'next/headers';
import { config, isProduction } from './config';
import { accountsVerify, type AccountsUser } from './accounts';
import { AuthError } from './errors';
import { claimEmailListsForUser, upsertUser } from './owners';
import type { SessionUser } from './types';

export { AuthError };

/**
 * Serika account sessions.
 *
 * The accounts JWT (a 30-day "remember me" session) lives in an httpOnly
 * cookie that also lasts 30 days. Every request validates it against
 * accounts.serika.dev, memoised for a minute so one render does not fan out
 * into several calls to the auth service.
 */

const VERIFY_CACHE_TTL_MS = 60_000;
const VERIFY_CACHE_MAX = 500;

type CacheEntry = { user: SessionUser | null; expires: number };

declare global {
  // eslint-disable-next-line no-var
  var __serikaWishlistVerifyCache: Map<string, CacheEntry> | undefined;
}

function verifyCache(): Map<string, CacheEntry> {
  return (globalThis.__serikaWishlistVerifyCache ??= new Map());
}

export function invalidateSessionCache(token: string): void {
  verifyCache().delete(token);
}

export function toSessionUser(account: AccountsUser): SessionUser {
  return {
    id: String(account.id),
    username: account.username || 'unknown',
    displayName: account.displayName || null,
    email: account.email || null,
    avatar: account.avatar || null,
  };
}

/** Validate a raw token, sync the local user row and pull in lists saved under its email. */
export async function resolveToken(token: string): Promise<SessionUser | null> {
  const cacheMap = verifyCache();
  const hit = cacheMap.get(token);
  if (hit && hit.expires > Date.now()) return hit.user;

  const result = await accountsVerify(token);
  // A 503 means accounts is down, not that the session is bad.
  if (result.status === 503) return hit?.user ?? null;

  const user =
    result.ok && result.data.valid && result.data.user ? toSessionUser(result.data.user) : null;

  if (user) {
    try {
      await upsertUser(user);
      // Someone who saved lists as a guest and later made a Serika account on
      // the same address gets them moved over the first time we see them.
      const moved = await claimEmailListsForUser(user);
      if (moved > 0) console.log(`[auth] moved ${moved} guest list(s) into ${user.username}`);
    } catch (error) {
      console.error('[auth] failed to sync user row:', error);
    }
  }

  if (cacheMap.size > VERIFY_CACHE_MAX) cacheMap.clear();
  cacheMap.set(token, { user, expires: Date.now() + VERIFY_CACHE_TTL_MS });
  return user;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(config.SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await resolveToken(token);
  } catch (error) {
    console.error('[auth] session resolution failed:', error);
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('You must be signed in to do that.', 401);
  return user;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(config.SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: config.SESSION_TTL_S,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  const token = store.get(config.SESSION_COOKIE)?.value;
  if (token) invalidateSessionCache(token);
  store.delete(config.SESSION_COOKIE);
}
