import { config } from './config';
import { query, queryOne, transaction, type Queryable } from './db';
import { cleanPrice } from './currency';
import { areFriends, friendIds } from './friends';
import { randomSlug } from './tokens';
import type { Item, ItemDraft, Viewer, Visibility, Wishlist } from './types';

/**
 * Wishlists and their items. Pure data access: no cookies, no Next imports,
 * so the CLI import script can use it too. Callers decide who may do what
 * with `canEdit`.
 */

export type Owner = { userId: string } | { guestId: string };

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

interface ListRow {
  id: string;
  slug: string;
  owner_user_id: string | null;
  owner_guest_id: string | null;
  title: string;
  description: string;
  emoji: string;
  icon_url: string | null;
  visibility: Visibility;
  show_reservations: boolean;
  source: string | null;
  source_url: string | null;
  created_at: Date;
  updated_at: Date;
  item_count?: number;
  preview_images?: string[] | null;
  total_amount?: string | null;
  total_currency?: string | null;
  totals?: Record<string, string | number> | null;
}

function mapList(row: ListRow): Wishlist {
  return {
    id: row.id,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    ownerGuestId: row.owner_guest_id,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    iconUrl: row.icon_url ?? null,
    visibility: row.visibility,
    showReservations: row.show_reservations,
    source: row.source,
    sourceUrl: row.source_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    itemCount: row.item_count,
    previewImages: row.preview_images?.filter(Boolean) ?? undefined,
    totalValue:
      row.total_amount && row.total_currency
        ? { amount: Number(row.total_amount), currency: row.total_currency }
        : null,
    totals: row.totals ? Object.fromEntries(Object.entries(row.totals).map(([c, v]) => [c, Number(v)])) : undefined,
  };
}

interface ItemRow {
  id: string;
  wishlist_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  price: string | null;
  currency: string | null;
  store: string | null;
  note: string;
  quantity: number;
  priority: number;
  position: number;
  received_at: Date | null;
  created_at: Date;
  reserved_count?: number;
  reserved_by_me?: boolean;
  reserved_names?: string[] | null;
}

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    wishlistId: row.wishlist_id,
    title: row.title,
    url: row.url,
    imageUrl: row.image_url,
    price: row.price === null ? null : Number(row.price),
    currency: row.currency,
    store: row.store,
    note: row.note,
    quantity: row.quantity,
    priority: row.priority,
    position: row.position,
    receivedAt: row.received_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    reservedCount: row.reserved_count,
    reservedByMe: row.reserved_by_me,
    reservedNames: row.reserved_names?.filter(Boolean) ?? undefined,
  };
}

// The list card summary: item count, four cover images and the total in the
// list's most common currency.
const LIST_SUMMARY = `
  w.*,
  (SELECT COUNT(*)::int FROM items i WHERE i.wishlist_id = w.id) AS item_count,
  ARRAY(SELECT i.image_url FROM items i WHERE i.wishlist_id = w.id AND i.image_url IS NOT NULL
        ORDER BY i.priority DESC, i.position ASC LIMIT 4) AS preview_images,
  t.total_amount, t.total_currency, tt.totals`;

const LIST_TOTAL_JOIN = `
  LEFT JOIN LATERAL (
    SELECT SUM(i.price * i.quantity) AS total_amount, i.currency AS total_currency
    FROM items i WHERE i.wishlist_id = w.id AND i.price IS NOT NULL AND i.received_at IS NULL
    GROUP BY i.currency ORDER BY COUNT(*) DESC LIMIT 1
  ) t ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(x.currency, x.amount) AS totals FROM (
      SELECT COALESCE(i.currency, 'EUR') AS currency, SUM(i.price * i.quantity) AS amount
      FROM items i WHERE i.wishlist_id = w.id AND i.price IS NOT NULL AND i.received_at IS NULL
      GROUP BY 1
    ) x
  ) tt ON TRUE`;

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export function canEdit(list: Pick<Wishlist, 'ownerUserId' | 'ownerGuestId'>, viewer: Viewer): boolean {
  if (viewer.user && list.ownerUserId === viewer.user.id) return true;
  if (viewer.guest && !viewer.guest.claimedUserId && list.ownerGuestId === viewer.guest.id) return true;
  return false;
}

/** Private lists are the owner's alone; "friends" lists need an accepted friendship. */
export async function canView(list: Wishlist, viewer: Viewer): Promise<boolean> {
  if (canEdit(list, viewer)) return true;
  if (list.visibility === 'private') return false;
  if (list.visibility === 'friends') return areFriends(viewer.user?.id, list.ownerUserId);
  return true;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > config.LIMITS.URL_MAX) return null;
  try {
    const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function storeFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').replace(/^smile\./, '');
  } catch {
    return null;
  }
}

export function cleanCurrency(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(upper) ? upper : null;
}

export { cleanPrice } from './currency';

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** Normalise anything item-shaped into something safe to store, or null if it has no title. */
export function sanitizeDraft(draft: { [K in keyof ItemDraft]?: unknown }): ItemDraft | null {
  const url = cleanUrl(draft.url);
  const title = clip(draft.title, config.LIMITS.TITLE_MAX) || (url ? storeFromUrl(url) ?? '' : '');
  if (!title) return null;
  const quantity = Math.min(999, Math.max(1, Math.round(Number(draft.quantity) || 1)));
  return {
    title,
    url,
    imageUrl: cleanUrl(draft.imageUrl),
    price: cleanPrice(draft.price),
    currency: cleanCurrency(draft.currency),
    store: clip(draft.store, 80) || storeFromUrl(url),
    note: typeof draft.note === 'string' ? draft.note.trim().slice(0, config.LIMITS.NOTE_MAX) : '',
    quantity,
    priority: Number(draft.priority) > 0 ? 1 : 0,
    sourceRef: clip(draft.sourceRef, 200) || null,
  };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function listsForViewer(viewer: Viewer): Promise<Wishlist[]> {
  const userId = viewer.user?.id ?? null;
  const guestId = viewer.guest && !viewer.guest.claimedUserId ? viewer.guest.id : null;
  if (!userId && !guestId) return [];
  const rows = await query<ListRow>(
    `SELECT ${LIST_SUMMARY} FROM wishlists w ${LIST_TOTAL_JOIN}
     WHERE ($1::text IS NOT NULL AND w.owner_user_id = $1) OR ($2::uuid IS NOT NULL AND w.owner_guest_id = $2)
     ORDER BY w.position ASC, w.updated_at DESC`,
    [userId, guestId]
  );
  return rows.map(mapList);
}

/** What a profile shows: public lists, plus "friends" lists when the viewer is a friend (or the owner). */
export async function profileListsForUser(userId: string, options: { includeFriends: boolean }): Promise<Wishlist[]> {
  const rows = await query<ListRow>(
    `SELECT ${LIST_SUMMARY} FROM wishlists w ${LIST_TOTAL_JOIN}
     WHERE w.owner_user_id = $1 AND (w.visibility = 'public' OR ($2 AND w.visibility = 'friends'))
     ORDER BY w.position ASC, w.updated_at DESC`,
    [userId, options.includeFriends]
  );
  return rows.map(mapList);
}

export function publicListsForUser(userId: string): Promise<Wishlist[]> {
  return profileListsForUser(userId, { includeFriends: false });
}

/** Recently updated lists from everyone the viewer is friends with (friends come from serika-accounts). */
export async function friendsFeed(
  viewerId: string,
  limit = 24
): Promise<(Wishlist & { owner: { username: string; displayName: string | null; avatar: string | null } })[]> {
  const ids = await friendIds(viewerId);
  if (ids.length === 0) return [];
  const rows = await query<ListRow & { o_username: string; o_display_name: string | null; o_avatar: string | null }>(
    `SELECT ${LIST_SUMMARY}, u.username AS o_username, u.display_name AS o_display_name, u.avatar AS o_avatar
     FROM wishlists w ${LIST_TOTAL_JOIN}
     JOIN users u ON u.id = w.owner_user_id
     WHERE w.owner_user_id = ANY($1) AND w.visibility IN ('public', 'friends')
       AND EXISTS (SELECT 1 FROM items i WHERE i.wishlist_id = w.id)
     ORDER BY w.updated_at DESC LIMIT $2`,
    [ids, limit]
  );
  return rows.map((row) => ({
    ...mapList(row),
    owner: { username: row.o_username, displayName: row.o_display_name, avatar: row.o_avatar },
  }));
}

export async function getListBySlug(slug: string): Promise<Wishlist | null> {
  if (!/^[a-z0-9]{4,16}$/.test(slug)) return null;
  const row = await queryOne<ListRow>(
    `SELECT ${LIST_SUMMARY} FROM wishlists w ${LIST_TOTAL_JOIN} WHERE w.slug = $1`,
    [slug]
  );
  return row ? mapList(row) : null;
}

export async function getListById(id: string, client?: Queryable): Promise<Wishlist | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await queryOne<ListRow>(`SELECT * FROM wishlists WHERE id = $1`, [id], client);
  return row ? mapList(row) : null;
}

export async function countListsForOwner(owner: Owner): Promise<number> {
  const row = await queryOne<{ n: number }>(
    'userId' in owner
      ? `SELECT COUNT(*)::int AS n FROM wishlists WHERE owner_user_id = $1`
      : `SELECT COUNT(*)::int AS n FROM wishlists WHERE owner_guest_id = $1`,
    ['userId' in owner ? owner.userId : owner.guestId]
  );
  return row?.n ?? 0;
}

export async function createList(
  owner: Owner,
  input: {
    title: string;
    description?: string;
    emoji?: string;
    visibility?: Visibility;
    source?: string | null;
    sourceUrl?: string | null;
  },
  client?: Queryable
): Promise<Wishlist> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await queryOne<ListRow>(
        `INSERT INTO wishlists (slug, owner_user_id, owner_guest_id, title, description, emoji, visibility, source, source_url, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
           COALESCE((SELECT MIN(position) - 1 FROM wishlists WHERE owner_user_id = $2 OR owner_guest_id = $3), 0))
         RETURNING *`,
        [
          randomSlug(),
          'userId' in owner ? owner.userId : null,
          'guestId' in owner ? owner.guestId : null,
          input.title.trim().slice(0, config.LIMITS.LIST_TITLE_MAX) || 'My wishlist',
          (input.description || '').trim().slice(0, config.LIMITS.DESCRIPTION_MAX),
          cleanEmoji(input.emoji),
          input.visibility || 'unlisted',
          input.source || null,
          input.sourceUrl || null,
        ],
        client
      );
      return mapList({ ...row!, item_count: 0 });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') continue; // slug collision
      throw error;
    }
  }
  throw new Error('Could not allocate a wishlist slug.');
}

export function cleanEmoji(value: unknown): string {
  if (typeof value !== 'string') return '🎁';
  const trimmed = value.trim();
  // One grapheme, and it has to be an emoji-ish symbol rather than text.
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)];
  if (segments.length !== 1 || !/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(trimmed)) return '🎁';
  return trimmed;
}

export async function updateList(
  id: string,
  patch: Partial<Pick<Wishlist, 'title' | 'description' | 'emoji' | 'iconUrl' | 'visibility' | 'showReservations'>>
): Promise<Wishlist | null> {
  const sets: string[] = [];
  const values: unknown[] = [id];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (patch.title !== undefined) add('title', patch.title.trim().slice(0, config.LIMITS.LIST_TITLE_MAX) || 'My wishlist');
  if (patch.description !== undefined) add('description', patch.description.trim().slice(0, config.LIMITS.DESCRIPTION_MAX));
  if (patch.emoji !== undefined) add('emoji', cleanEmoji(patch.emoji));
  if (patch.iconUrl !== undefined) add('icon_url', patch.iconUrl);
  if (patch.visibility !== undefined) add('visibility', patch.visibility);
  if (patch.showReservations !== undefined) add('show_reservations', patch.showReservations);
  if (sets.length === 0) return getListById(id);
  const row = await queryOne<ListRow>(
    `UPDATE wishlists SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  return row ? mapList(row) : null;
}

export async function deleteList(id: string): Promise<void> {
  await query(`DELETE FROM wishlists WHERE id = $1`, [id]);
}

export async function touchList(id: string, client?: Queryable): Promise<void> {
  await query(`UPDATE wishlists SET updated_at = NOW() WHERE id = $1`, [id], client);
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * Items in display order: most wanted first, then the owner's order.
 * Reservation details are filled in only when `revealReservations` is set,
 * which callers pass for gift-givers and for owners who turned spoilers on.
 */
export async function listItems(
  listId: string,
  options: { revealReservations: boolean; gifterId?: string | null }
): Promise<Item[]> {
  const rows = await query<ItemRow>(
    `SELECT i.*,
       (SELECT COUNT(*)::int FROM reservations r WHERE r.item_id = i.id) AS reserved_count,
       EXISTS (SELECT 1 FROM reservations r WHERE r.item_id = i.id AND r.gifter_id = $2) AS reserved_by_me,
       ARRAY(SELECT r.name FROM reservations r WHERE r.item_id = i.id AND r.name <> '' ORDER BY r.created_at) AS reserved_names
     FROM items i WHERE i.wishlist_id = $1
     ORDER BY (i.received_at IS NOT NULL) ASC, i.priority DESC, i.position ASC, i.created_at DESC`,
    [listId, options.gifterId || '']
  );
  return rows.map((row) => {
    const item = mapItem(row);
    if (!options.revealReservations) {
      item.reservedCount = 0;
      item.reservedNames = [];
      item.reservedByMe = Boolean(row.reserved_by_me);
    }
    return item;
  });
}

export async function getItem(id: string): Promise<(Item & { list: Wishlist }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await queryOne<ItemRow>(`SELECT * FROM items WHERE id = $1`, [id]);
  if (!row) return null;
  const list = await getListById(row.wishlist_id);
  return list ? { ...mapItem(row), list } : null;
}

export async function countItems(listId: string, client?: Queryable): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM items WHERE wishlist_id = $1`,
    [listId],
    client
  );
  return row?.n ?? 0;
}

/**
 * Add items. New single adds go to the top; imports keep their source order
 * and are placed after anything already there.
 */
export async function addItems(
  listId: string,
  drafts: ItemDraft[],
  options: { placement: 'top' | 'bottom' } = { placement: 'top' },
  client?: Queryable
): Promise<Item[]> {
  if (drafts.length === 0) return [];
  const run = async (db: Queryable) => {
    const existing = await countItems(listId, db);
    const room = config.LIMITS.ITEMS_PER_LIST - existing;
    if (room <= 0) throw new Error(`A wishlist holds up to ${config.LIMITS.ITEMS_PER_LIST} items.`);
    const accepted = drafts.slice(0, room);

    const bounds = await queryOne<{ min: number | null; max: number | null }>(
      `SELECT MIN(position) AS min, MAX(position) AS max FROM items WHERE wishlist_id = $1`,
      [listId],
      db
    );
    const start =
      options.placement === 'top'
        ? (bounds?.min ?? 0) - accepted.length
        : (bounds?.max ?? -1) + 1;

    const created: Item[] = [];
    for (let index = 0; index < accepted.length; index++) {
      const d = accepted[index];
      const row = await queryOne<ItemRow>(
        `INSERT INTO items (wishlist_id, title, url, image_url, price, currency, store, note, quantity, priority, position, source_ref)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          listId,
          d.title,
          d.url ?? null,
          d.imageUrl ?? null,
          d.price ?? null,
          d.price !== null && d.price !== undefined ? d.currency || 'EUR' : d.currency ?? null,
          d.store ?? null,
          d.note ?? '',
          d.quantity ?? 1,
          d.priority ?? 0,
          start + index,
          d.sourceRef ?? null,
        ],
        db
      );
      created.push(mapItem(row!));
    }
    await touchList(listId, db);
    return created;
  };
  return client ? run(client) : transaction(run);
}

export async function updateItem(
  id: string,
  patch: Partial<ItemDraft> & { received?: boolean; position?: number }
): Promise<Item | null> {
  const sets: string[] = [];
  const values: unknown[] = [id];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (patch.title !== undefined) {
    const title = clip(patch.title, config.LIMITS.TITLE_MAX);
    if (title) add('title', title);
  }
  if (patch.url !== undefined) {
    const url = cleanUrl(patch.url);
    add('url', url);
    if (patch.store === undefined) add('store', storeFromUrl(url));
  }
  if (patch.imageUrl !== undefined) add('image_url', cleanUrl(patch.imageUrl));
  if (patch.price !== undefined) add('price', cleanPrice(patch.price));
  if (patch.currency !== undefined) add('currency', cleanCurrency(patch.currency));
  if (patch.store !== undefined) add('store', clip(patch.store, 80) || null);
  if (patch.note !== undefined) add('note', (patch.note || '').trim().slice(0, config.LIMITS.NOTE_MAX));
  if (patch.quantity !== undefined) add('quantity', Math.min(999, Math.max(1, Math.round(Number(patch.quantity) || 1))));
  if (patch.priority !== undefined) add('priority', Number(patch.priority) > 0 ? 1 : 0);
  if (patch.position !== undefined && Number.isFinite(patch.position)) add('position', patch.position);
  if (patch.received !== undefined) sets.push(patch.received ? 'received_at = COALESCE(received_at, NOW())' : 'received_at = NULL');
  if (sets.length === 0) return (await getItem(id)) ?? null;

  const row = await queryOne<ItemRow>(
    `UPDATE items SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  if (row) await touchList(row.wishlist_id);
  return row ? mapItem(row) : null;
}

export async function deleteItem(id: string): Promise<void> {
  const row = await queryOne<{ wishlist_id: string }>(`DELETE FROM items WHERE id = $1 RETURNING wishlist_id`, [id]);
  if (row) await touchList(row.wishlist_id);
}

/** Owner reorder: `ids` is the new order for (a subset of) the list's items. */
export async function reorderItems(listId: string, ids: string[]): Promise<void> {
  await transaction(async (client) => {
    for (let index = 0; index < ids.length; index++) {
      await query(`UPDATE items SET position = $3 WHERE id = $1 AND wishlist_id = $2`, [ids[index], listId, index], client);
    }
    await touchList(listId, client);
  });
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export async function reserveItem(itemId: string, gifterId: string, name: string): Promise<'ok' | 'full' | 'already'> {
  return transaction(async (client) => {
    const item = await queryOne<{ quantity: number }>(`SELECT quantity FROM items WHERE id = $1 FOR UPDATE`, [itemId], client);
    if (!item) return 'full';
    const mine = await queryOne(`SELECT 1 FROM reservations WHERE item_id = $1 AND gifter_id = $2`, [itemId, gifterId], client);
    if (mine) return 'already';
    const taken = await queryOne<{ n: number }>(`SELECT COUNT(*)::int AS n FROM reservations WHERE item_id = $1`, [itemId], client);
    if ((taken?.n ?? 0) >= item.quantity) return 'full';
    await query(
      `INSERT INTO reservations (item_id, gifter_id, name) VALUES ($1, $2, $3)`,
      [itemId, gifterId, name.trim().slice(0, 60)],
      client
    );
    return 'ok';
  });
}

export async function unreserveItem(itemId: string, gifterId: string): Promise<void> {
  await query(`DELETE FROM reservations WHERE item_id = $1 AND gifter_id = $2`, [itemId, gifterId]);
}
