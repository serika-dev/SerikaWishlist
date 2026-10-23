import { cache } from 'react';
import { cookies } from 'next/headers';
import { config, isProduction } from './config';
import { query, queryOne, type Queryable } from './db';
import { createGuest, toGuest } from './owners';
import { hashToken, randomToken } from './tokens';
import type { Guest } from './types';

/**
 * Guest sessions.
 *
 * Anyone can start a wishlist without an account: the first save creates a
 * guest and a 30-day session cookie. Adding an email (proven by a magic link)
 * is what makes the list reachable from another device or after the cookie
 * is gone.
 */

export const getCurrentGuest = cache(async (): Promise<Guest | null> => {
  const store = await cookies();
  const raw = store.get(config.GUEST_COOKIE)?.value;
  if (!raw) return null;
  try {
    const row = await queryOne<{
      id: string;
      email: string | null;
      pending_email: string | null;
      claimed_user_id: string | null;
    }>(
      `SELECT g.id, g.email, g.pending_email, g.claimed_user_id
       FROM guest_sessions s JOIN guests g ON g.id = s.guest_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [hashToken(raw)]
    );
    return row ? toGuest(row) : null;
  } catch (error) {
    console.error('[guest] session lookup failed:', error);
    return null;
  }
});

/** Issue a fresh 30-day session for `guestId` in this browser. */
export async function startGuestSession(guestId: string, client?: Queryable): Promise<void> {
  const raw = randomToken();
  await query(
    `INSERT INTO guest_sessions (token_hash, guest_id, expires_at)
     VALUES ($1, $2, NOW() + make_interval(secs => $3))`,
    [hashToken(raw), guestId, config.SESSION_TTL_S],
    client
  );
  await query(`UPDATE guests SET last_seen_at = NOW() WHERE id = $1`, [guestId], client);
  const store = await cookies();
  store.set(config.GUEST_COOKIE, raw, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: config.SESSION_TTL_S,
  });
}

/** The current guest, or a brand-new anonymous one with a session cookie. */
export async function ensureGuest(): Promise<Guest> {
  const current = await getCurrentGuest();
  if (current && !current.claimedUserId) return current;
  const guest = await createGuest();
  await startGuestSession(guest.id);
  return guest;
}

export async function clearGuestSession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(config.GUEST_COOKIE)?.value;
  if (raw) {
    await query(`DELETE FROM guest_sessions WHERE token_hash = $1`, [hashToken(raw)]).catch(() => {});
  }
  store.delete(config.GUEST_COOKIE);
}

/** Housekeeping, called opportunistically: expired sessions and spent links. */
export async function pruneExpired(): Promise<void> {
  await query(`DELETE FROM guest_sessions WHERE expires_at < NOW()`);
  await query(`DELETE FROM magic_links WHERE expires_at < NOW() - INTERVAL '7 days'`);
}
