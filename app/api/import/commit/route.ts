import { fail, handler, ok, readJson } from '@/lib/api';
import { config } from '@/lib/config';
import { ensureGuest } from '@/lib/guest';
import { commitImport, type ImportSource } from '@/lib/importers';
import { canEdit, cleanUrl, countListsForOwner, getListById, sanitizeDraft } from '@/lib/lists';
import type { ItemDraft } from '@/lib/types';
import { getViewer, ownerOf } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCES: ImportSource[] = ['throne', 'mywishlist', 'wishlistcom', 'page'];

/**
 * Save previewed items (from the import page or the bookmarklet) into a new
 * list, or append them to one the viewer owns.
 */
export const POST = handler(async (request: Request) => {
  const body = await readJson<{
    title?: string;
    description?: string;
    source?: string;
    sourceUrl?: string;
    items?: Record<string, unknown>[];
    intoListId?: string;
  }>(request);

  const items = (Array.isArray(body.items) ? body.items : [])
    .slice(0, config.LIMITS.IMPORT_MAX_ITEMS)
    .map((entry) => sanitizeDraft(entry))
    .filter((d): d is ItemDraft => d !== null);
  if (items.length === 0) return fail('There is nothing to import.');

  const viewer = await getViewer();
  let intoList = null;
  if (body.intoListId) {
    intoList = await getListById(body.intoListId);
    if (!intoList || !canEdit(intoList, viewer)) return fail('You cannot add to that wishlist.', 403);
  }
  const owner = ownerOf(viewer) ?? { guestId: (await ensureGuest()).id };
  if (!intoList && (await countListsForOwner(owner)) >= config.LIMITS.LISTS_PER_OWNER) {
    return fail(`You can have up to ${config.LIMITS.LISTS_PER_OWNER} wishlists.`);
  }

  const source = SOURCES.includes(body.source as ImportSource) ? (body.source as ImportSource) : null;
  const { list, added } = await commitImport({
    owner,
    intoList,
    title: typeof body.title === 'string' && body.title.trim() ? body.title : 'Imported wishlist',
    description: typeof body.description === 'string' ? body.description : '',
    source,
    sourceUrl: cleanUrl(body.sourceUrl),
    items,
  });
  return ok({ list, added }, 201);
});
