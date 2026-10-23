import { query, queryOne, transaction, type Queryable } from './db';
import type { Guest, SessionUser } from './types';

/**
 * Who owns what, and moving lists between owners.
 *
 * A wishlist belongs to exactly one owner: a Serika account or a guest. Guest
 * lists follow the person, not the browser, once they prove an email address:
 * a magic link merges them into the guest for that address, and the first
 * time someone signs in with a Serika account on that address, everything
 * saved under it moves into the account.
 */

interface GuestRow {
  id: string;
  email: string | null;
  pending_email: string | null;
  claimed_user_id: string | null;
}

export function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    email: row.email,
    pendingEmail: row.pending_email,
    claimedUserId: row.claimed_user_id,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Mirror the account into our users table so lists can reference it. */
export async function upsertUser(user: SessionUser, client?: Queryable): Promise<void> {
  await query(
    `INSERT INTO users (id, username, display_name, email, avatar, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE
       SET username = EXCLUDED.username,
           display_name = EXCLUDED.display_name,
           email = EXCLUDED.email,
           avatar = EXCLUDED.avatar,
           last_seen_at = NOW()`,
    [user.id, user.username, user.displayName, user.email, user.avatar],
    client
  );
}

export async function getGuest(id: string): Promise<Guest | null> {
  const row = await queryOne<GuestRow>(
    `SELECT id, email, pending_email, claimed_user_id FROM guests WHERE id = $1`,
    [id]
  );
  return row ? toGuest(row) : null;
}

export async function findGuestByEmail(email: string, client?: Queryable): Promise<Guest | null> {
  const row = await queryOne<GuestRow>(
    `SELECT id, email, pending_email, claimed_user_id FROM guests WHERE LOWER(email) = $1`,
    [normalizeEmail(email)],
    client
  );
  return row ? toGuest(row) : null;
}

export async function createGuest(client?: Queryable): Promise<Guest> {
  const row = await queryOne<GuestRow>(
    `INSERT INTO guests DEFAULT VALUES RETURNING id, email, pending_email, claimed_user_id`,
    [],
    client
  );
  return toGuest(row!);
}

/** Every list of `fromGuestId` now belongs to the account. Returns how many moved. */
export async function moveGuestListsToUser(
  fromGuestId: string,
  userId: string,
  client: Queryable
): Promise<number> {
  const moved = await query<{ id: string }>(
    `UPDATE wishlists SET owner_user_id = $2, owner_guest_id = NULL, updated_at = NOW()
     WHERE owner_guest_id = $1 RETURNING id`,
    [fromGuestId, userId],
    client
  );
  await query(
    `UPDATE guests SET claimed_user_id = $2, claimed_at = COALESCE(claimed_at, NOW()) WHERE id = $1`,
    [fromGuestId, userId],
    client
  );
  return moved.length;
}

export async function moveGuestListsToGuest(
  fromGuestId: string,
  toGuestId: string,
  client: Queryable
): Promise<number> {
  if (fromGuestId === toGuestId) return 0;
  const moved = await query<{ id: string }>(
    `UPDATE wishlists SET owner_guest_id = $2, updated_at = NOW()
     WHERE owner_guest_id = $1 RETURNING id`,
    [fromGuestId, toGuestId],
    client
  );
  return moved.length;
}

/**
 * Lists saved under the account's email as a guest move into the account.
 * Accounts only sign in with a verified email, and guest emails are only set
 * once proven, so both sides have shown they own the address.
 */
export async function claimEmailListsForUser(user: SessionUser): Promise<number> {
  if (!user.email) return 0;
  const email = normalizeEmail(user.email);
  const pending = await query<{ id: string }>(
    `SELECT id FROM guests WHERE LOWER(email) = $1 AND claimed_user_id IS NULL`,
    [email]
  );
  if (pending.length === 0) return 0;

  return transaction(async (client) => {
    let moved = 0;
    for (const guest of pending) moved += await moveGuestListsToUser(guest.id, user.id, client);
    return moved;
  });
}

/** The account a verified email belongs to, from our mirror of accounts users. */
export async function findUserByEmail(email: string): Promise<SessionUser | null> {
  const row = await queryOne<{
    id: string;
    username: string;
    display_name: string | null;
    email: string | null;
    avatar: string | null;
  }>(
    `SELECT id, username, display_name, email, avatar FROM users WHERE LOWER(email) = $1
     ORDER BY last_seen_at DESC LIMIT 1`,
    [normalizeEmail(email)]
  );
  return row
    ? {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        email: row.email,
        avatar: row.avatar,
      }
    : null;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export async function getPublicUser(by: { id?: string; username?: string }): Promise<PublicUser | null> {
  const row = await queryOne<{ id: string; username: string; display_name: string | null; avatar: string | null }>(
    by.id
      ? `SELECT id, username, display_name, avatar FROM users WHERE id = $1`
      : `SELECT id, username, display_name, avatar FROM users WHERE LOWER(username) = LOWER($1) ORDER BY last_seen_at DESC LIMIT 1`,
    [by.id ?? by.username]
  );
  return row ? { id: row.id, username: row.username, displayName: row.display_name, avatar: row.avatar } : null;
}
