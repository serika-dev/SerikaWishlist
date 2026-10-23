export interface SessionUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatar: string | null;
}

export interface Guest {
  id: string;
  /** Proven with a magic link. */
  email: string | null;
  /** Typed in, link sent, not clicked yet. */
  pendingEmail: string | null;
  claimedUserId: string | null;
}

/** Whoever is looking at the page: a Serika account, a guest, both, or neither. */
export interface Viewer {
  user: SessionUser | null;
  guest: Guest | null;
}

export type Visibility = 'public' | 'unlisted' | 'friends' | 'private';
export const VISIBILITIES: readonly Visibility[] = ['public', 'unlisted', 'friends', 'private'];

export interface Wishlist {
  id: string;
  slug: string;
  ownerUserId: string | null;
  ownerGuestId: string | null;
  title: string;
  description: string;
  emoji: string;
  visibility: Visibility;
  showReservations: boolean;
  source: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  previewImages?: string[];
  totalValue?: { amount: number; currency: string } | null;
  /** Unreceived wishes' value per currency, for totals in the viewer's currency. */
  totals?: Record<string, number>;
}

export interface Item {
  id: string;
  wishlistId: string;
  title: string;
  url: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  store: string | null;
  note: string;
  quantity: number;
  priority: number;
  position: number;
  receivedAt: string | null;
  createdAt: string;
  /** Visible to gift-givers always, and to the owner only with spoilers on. */
  reservedCount?: number;
  /** Reserved by the current browser (so it can be undone). */
  reservedByMe?: boolean;
  reservedNames?: string[];
}

/** An item as it arrives from the bookmarklet, an importer or a form. */
export interface ItemDraft {
  title: string;
  url?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  store?: string | null;
  note?: string | null;
  quantity?: number | null;
  priority?: number | null;
  sourceRef?: string | null;
}
