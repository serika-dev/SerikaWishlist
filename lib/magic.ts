import { accountsGetUser } from './accounts';
import { toSessionUser } from './auth';
import { config } from './config';
import { query, queryOne, transaction } from './db';
import { sendEmail } from './email/ses';
import { magicLinkEmail } from './email/templates';
import {
  findGuestByEmail,
  findUserByEmail,
  moveGuestListsToGuest,
  moveGuestListsToUser,
  normalizeEmail,
  upsertUser,
} from './owners';
import { safeReturnPath } from './return-path';
import { hashToken, randomToken } from './tokens';
import type { SessionUser } from './types';

/**
 * Magic links: how a guest saves a wishlist with nothing but an email, and
 * how they get back to it later from any device.
 *
 * A link proves the address. Redeeming it attaches the address to the guest
 * (merging into an existing guest for that address if there is one) and, if
 * the address belongs to a Serika account, moves everything into the account.
 */

export class MagicLinkError extends Error {}

/** Which Serika account (if any) owns this address: our mirror first, then accounts. */
async function accountForEmail(email: string): Promise<SessionUser | null> {
  const mirrored = await findUserByEmail(email);
  if (mirrored) return mirrored;
  try {
    const result = await accountsGetUser(email);
    const account = result.ok ? result.data.user : undefined;
    if (!account?.id || account.isVerified === false) return null;
    return toSessionUser(account);
  } catch {
    return null;
  }
}

async function listsForEmail(email: string, guestId: string | null) {
  return query<{ emoji: string; title: string; slug: string; item_count: number }>(
    `SELECT w.emoji, w.title, w.slug, (SELECT COUNT(*)::int FROM items i WHERE i.wishlist_id = w.id) AS item_count
     FROM wishlists w
     WHERE w.owner_guest_id IN (
       SELECT id FROM guests WHERE LOWER(email) = $1 AND claimed_user_id IS NULL
       UNION SELECT $2::uuid WHERE $2::uuid IS NOT NULL
     )
     ORDER BY w.updated_at DESC LIMIT 10`,
    [normalizeEmail(email), guestId]
  );
}

/**
 * Email a link. `guestId` is the browser's current guest, whose lists should
 * follow the address once the link is used. Always succeeds from the caller's
 * point of view, so the response never reveals whether an address is known.
 */
export async function requestMagicLink(input: {
  email: string;
  guestId: string | null;
  returnTo?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);

  const recent = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM magic_links WHERE LOWER(email) = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [email]
  );
  if ((recent?.n ?? 0) >= config.LIMITS.MAGIC_LINKS_PER_EMAIL_PER_HOUR) return;

  if (input.guestId) {
    await query(`UPDATE guests SET pending_email = $2 WHERE id = $1 AND email IS NULL`, [
      input.guestId,
      email,
    ]);
  }

  const raw = randomToken();
  await query(
    `INSERT INTO magic_links (token_hash, email, guest_id, return_to, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + make_interval(secs => $5))`,
    [hashToken(raw), email, input.guestId, safeReturnPath(input.returnTo), config.MAGIC_LINK_TTL_S]
  );

  const [existingGuest, account, lists] = await Promise.all([
    findGuestByEmail(email),
    accountForEmail(email),
    listsForEmail(email, input.guestId),
  ]);

  const message = magicLinkEmail({
    link: `${config.BASE_URL}/magic/${raw}`,
    lists: lists.map((l) => ({ title: l.title, slug: l.slug, itemCount: l.item_count })),
    firstSave: !existingGuest && !account,
    accountUsername: account?.username ?? null,
  });

  await sendEmail({ to: email, ...message });
}

export interface RedeemResult {
  guestId: string;
  email: string;
  returnTo: string;
  /** Set when the address belongs to a Serika account and the lists moved there. */
  account: SessionUser | null;
  moved: number;
}

/** Spend a link. Single use: only the request that marks it used gets through. */
export async function redeemMagicLink(raw: string): Promise<RedeemResult> {
  if (!raw || raw.length < 16 || raw.length > 128) {
    throw new MagicLinkError('This link is not valid. Ask for a new one.');
  }

  const link = await queryOne<{ email: string; guest_id: string | null; return_to: string | null }>(
    `UPDATE magic_links SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING email, guest_id, return_to`,
    [hashToken(raw)]
  );
  if (!link) throw new MagicLinkError('This link has expired or was already used. Ask for a new one.');

  const email = normalizeEmail(link.email);
  const account = await accountForEmail(email);
  if (account) await upsertUser(account);

  return transaction(async (client) => {
    const existing = await findGuestByEmail(email, client);
    let guestId: string;
    let moved = 0;

    if (existing) {
      guestId = existing.id;
      if (link.guest_id && link.guest_id !== existing.id) {
        moved += await moveGuestListsToGuest(link.guest_id, existing.id, client);
        await query(`UPDATE guests SET pending_email = NULL WHERE id = $1`, [link.guest_id], client);
      }
    } else if (link.guest_id) {
      const adopted = await queryOne<{ id: string }>(
        `UPDATE guests SET email = $2, email_verified_at = NOW(), pending_email = NULL
         WHERE id = $1 AND email IS NULL RETURNING id`,
        [link.guest_id, email],
        client
      );
      if (adopted) {
        guestId = adopted.id;
      } else {
        // The requesting guest proved a different address in the meantime.
        const fresh = await queryOne<{ id: string }>(
          `INSERT INTO guests (email, email_verified_at) VALUES ($1, NOW()) RETURNING id`,
          [email],
          client
        );
        guestId = fresh!.id;
        moved += await moveGuestListsToGuest(link.guest_id, guestId, client);
      }
    } else {
      const fresh = await queryOne<{ id: string }>(
        `INSERT INTO guests (email, email_verified_at) VALUES ($1, NOW()) RETURNING id`,
        [email],
        client
      );
      guestId = fresh!.id;
    }

    if (account) moved = await moveGuestListsToUser(guestId, account.id, client);

    return {
      guestId,
      email,
      returnTo: safeReturnPath(link.return_to),
      account,
      moved,
    };
  });
}
