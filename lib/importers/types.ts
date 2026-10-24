import type { ItemDraft } from '../types';

export type ImportSource = 'throne' | 'mywishlist' | 'wishlistcom' | 'page';

export const SOURCE_LABELS: Record<ImportSource, string> = {
  throne: 'Throne',
  mywishlist: 'MyWishlist',
  wishlistcom: 'Wishlist.com',
  page: 'a web page',
};

export interface ImportedList {
  source: ImportSource;
  sourceUrl: string;
  title: string;
  description: string;
  /** The name the list is published under on the other site. */
  ownerName: string | null;
  items: ItemDraft[];
  /** Other lists by the same person on that site, offered as follow-up imports. */
  related: { title: string; url: string }[];
  /** A single product link rather than a list: the review screen adds it to an existing list. */
  single?: boolean;
}

/**
 * The other site would not talk to our server (bot wall, Cloudflare check).
 * The bookmarklet can still import it from the user's own browser.
 */
export class NeedsBrowserImportError extends Error {
  constructor(public source: ImportSource, message: string) {
    super(message);
  }
}

export class ImportError extends Error {}
