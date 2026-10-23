import { config } from '../config';
import { addItems, createList, type Owner } from '../lists';
import { transaction } from '../db';
import type { ItemDraft, Wishlist } from '../types';
import { importMyWishlist, isMyWishlistUrl } from './mywishlist';
import { importPage, isWishlistComUrl } from './page';
import { importThrone, throneUsername } from './throne';
import { ImportError, type ImportedList, type ImportSource } from './types';

export * from './types';

export function detectSource(raw: string): { url: URL; source: ImportSource } {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw new ImportError('That is not a link we can read.');
  }
  if (isMyWishlistUrl(url)) return { url, source: 'mywishlist' };
  if (throneUsername(url)) return { url, source: 'throne' };
  if (isWishlistComUrl(url)) return { url, source: 'wishlistcom' };
  return { url, source: 'page' };
}

/** Read a list from another site, without saving anything. */
export async function fetchImport(raw: string): Promise<ImportedList> {
  const { url, source } = detectSource(raw);
  switch (source) {
    case 'mywishlist':
      return importMyWishlist(url);
    case 'throne':
      return importThrone(url);
    default:
      return importPage(url, source);
  }
}

/**
 * Save an import: into a new list for `owner`, or appended to `intoList`.
 * One transaction, so a failure leaves nothing half-imported.
 */
export async function commitImport(input: {
  owner: Owner;
  intoList?: Wishlist | null;
  title: string;
  description?: string;
  source: ImportSource | null;
  sourceUrl: string | null;
  items: ItemDraft[];
}): Promise<{ list: Wishlist; added: number }> {
  const items = input.items.slice(0, config.LIMITS.IMPORT_MAX_ITEMS);
  return transaction(async (client) => {
    const list =
      input.intoList ??
      (await createList(
        input.owner,
        {
          title: input.title,
          description: input.description,
          emoji: input.source === 'throne' ? '👑' : '🎁',
          source: input.source,
          sourceUrl: input.sourceUrl,
        },
        client
      ));
    const added = await addItems(list.id, items, { placement: 'bottom' }, client);
    return { list, added: added.length };
  });
}
