import { config } from '../config';
import { fetchProduct } from '../products';
import { addItems, createList, sanitizeDraft, type Owner } from '../lists';
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
    case 'page': {
      // Most links pasted here that aren't lists are one product: read that first.
      const single = await fetchProduct(url.toString()).catch(() => null);
      const draft = single && !single.partial ? sanitizeDraft(single.product) : null;
      if (draft) {
        // A product that comes in versions becomes one row per version to pick from.
        const items = single!.variants.length
          ? single!.variants
              .map((v) => sanitizeDraft({ ...draft, variant: v.name, imageUrl: v.imageUrl ?? draft.imageUrl, price: v.price ?? draft.price, currency: v.currency ?? draft.currency, url: v.url ?? draft.url }))
              .filter((d): d is ItemDraft => d !== null)
          : [draft];
        return { source, sourceUrl: url.toString(), title: 'My wishlist', description: '', ownerName: null, related: [], items, single: true };
      }
      return importPage(url, source);
    }
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
