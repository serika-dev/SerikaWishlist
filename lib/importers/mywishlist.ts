import { decodeEntities } from '../extract';
import { cleanUrl, sanitizeDraft } from '../lists';
import { safeFetch } from '../safe-fetch';
import type { ItemDraft } from '../types';
import { ImportError, NeedsBrowserImportError, type ImportedList } from './types';

/**
 * MyWishlist (mywishlist.online). A public list page embeds every product as
 * `wishlist_products = {...}` for its lightbox, so one fetch has it all.
 * Product links go through their click-out page (/x/<shop>/<id>), which names
 * the real store URL in a meta refresh; we resolve those so imported items
 * link straight to the store.
 */

interface MwoProduct {
  id: number;
  title?: string;
  description?: string | null;
  price?: string | number | null;
  currency?: string | null;
  shop?: string | null;
  redirect_url?: string | null;
  image?: { url?: string } | null;
}

export function isMyWishlistUrl(url: URL): boolean {
  return /(^|\.)(my)?wishlist\.online$/.test(url.hostname) && /^\/w\/[a-z0-9]+/i.test(url.pathname);
}

export function parseMyWishlistPage(html: string, pageUrl: string) {
  const blob = html.match(/wishlist_products\s*=\s*(\{[\s\S]*?\})\s*;\s*\n/);
  if (!blob) throw new ImportError('That MyWishlist page has no products we can read. Is the list public?');

  let products: Record<string, MwoProduct>;
  try {
    products = JSON.parse(blob[1]);
  } catch {
    throw new ImportError('MyWishlist changed its page format; the products could not be read.');
  }

  // The grid's order is the owner's order; the JSON object is keyed by id.
  const order = [...html.matchAll(/class="product"\s+data-id="(\d+)"/g)].map((m) => m[1]);
  const ids = order.length ? order.filter((id) => products[id]) : Object.keys(products);

  const text = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m ? decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
  };
  const title = text(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || 'Imported wishlist';
  const description = text(/<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
  const ownerName = text(/<p class="small text-muted">\s*By ([^.<]+)\./i) || null;

  const current = new URL(pageUrl).pathname.split('/')[2];
  const related = [...html.matchAll(/<a class="dropdown-item\s*[^"]*" href="(https:\/\/mywishlist\.online\/w\/([a-z0-9]+)\/[^"]*)">[\s\S]*?&nbsp;\s*([^<]+)<\/a>/gi)]
    .filter((m) => m[2] !== current)
    .map((m) => ({ title: decodeEntities(m[3]).trim(), url: m[1] }));

  return { title, description, ownerName, related, products: ids.map((id) => products[id]) };
}

/**
 * MyWishlist earns its keep through affiliate links. Unwrap affiliate
 * redirectors that carry the destination in a parameter, and drop the
 * tracking parameters, so the link is the plain store page.
 */
export function unwrapAffiliate(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  for (let depth = 0; depth < 3; depth++) {
    const inner = ['url', 'u', 'murl', 'ued', 'destination', 'dest', 'r', 'link']
      .map((key) => url.searchParams.get(key))
      .find((value) => value && /^https?:\/\//i.test(value));
    if (!inner || !/partner|click|track|awin|tradedoubler|redirect|go\.|clk|aff/i.test(url.hostname + url.pathname)) break;
    try {
      url = new URL(inner);
    } catch {
      break;
    }
  }
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|ref_?$|tag$|affiliate|aff_|awc$|clickref|irclickid|ascsubtag|linkCode$|linkId$|camp$|creative)/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}

/** The real store URL behind a MyWishlist click-out link. */
async function resolveClickout(url: string): Promise<string | null> {
  try {
    const page = await safeFetch(url, { maxBytes: 20_000, timeoutMs: 8_000 });
    const target =
      page.text.match(/http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/i)?.[1] ||
      page.text.match(/location\.href\s*=\s*'([^']+)'/)?.[1];
    return target ? cleanUrl(unwrapAffiliate(decodeEntities(target))) : null;
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index]);
      }
    })
  );
  return out;
}

export async function toDrafts(products: MwoProduct[]): Promise<ItemDraft[]> {
  const drafts = await mapLimit(products, 8, async (p) => {
    const clickout = cleanUrl(p.redirect_url);
    const url = clickout ? (await resolveClickout(clickout)) ?? clickout : null;
    return sanitizeDraft({
      title: decodeEntities(p.title || ''),
      url,
      imageUrl: p.image?.url ?? null,
      price: p.price ?? null,
      currency: p.currency ?? null,
      store: p.shop ?? null,
      note: p.description ? decodeEntities(p.description) : '',
      sourceRef: `mywishlist:${p.id}`,
    });
  });
  return drafts.filter((d): d is ItemDraft => d !== null);
}

export async function importMyWishlist(url: URL): Promise<ImportedList> {
  const page = await safeFetch(url.toString());
  if (page.status === 403 || page.status === 429) {
    throw new NeedsBrowserImportError('mywishlist', 'MyWishlist would not let our server in.');
  }
  if (page.status === 404) throw new ImportError('That MyWishlist list does not exist (or is private).');
  if (page.status >= 400) throw new ImportError(`MyWishlist answered with an error (${page.status}).`);

  const parsed = parseMyWishlistPage(page.text, page.url);
  return {
    source: 'mywishlist',
    sourceUrl: page.url,
    title: parsed.title,
    description: parsed.description,
    ownerName: parsed.ownerName,
    related: parsed.related,
    items: await toDrafts(parsed.products),
  };
}
