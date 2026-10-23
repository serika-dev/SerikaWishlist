import { decodeEntities, isType, jsonLdNodes, offerPrice, productFromLd } from '../extract';
import { sanitizeDraft } from '../lists';
import { safeFetch } from '../safe-fetch';
import type { ItemDraft } from '../types';
import { ImportError, NeedsBrowserImportError, type ImportedList, type ImportSource } from './types';

/**
 * Lists on sites without a dedicated importer, Wishlist.com included: read
 * schema.org ItemList / Product data, then look through the page's embedded
 * app state (__NEXT_DATA__, __NUXT__, Apollo...) for arrays of things that
 * look like products. The bookmarklet runs the same heuristics in the browser.
 */

const TITLE_KEYS = ['title', 'name', 'productName', 'product_name', 'itemName'];
const URL_KEYS = ['url', 'link', 'productUrl', 'product_url', 'externalUrl', 'external_url', 'href', 'sourceUrl', 'source_url', 'purchaseUrl'];
const IMAGE_KEYS = ['image', 'imageUrl', 'image_url', 'img', 'imgUrl', 'imgLink', 'thumbnail', 'thumbnailUrl', 'photo', 'picture', 'images'];
const PRICE_KEYS = ['price', 'priceAmount', 'price_amount', 'amount', 'currentPrice', 'salePrice'];
const CURRENCY_KEYS = ['currency', 'priceCurrency', 'currencyCode', 'currency_code'];
const NOTE_KEYS = ['note', 'notes', 'comment', 'description'];

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  return undefined;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return asString(value[0]);
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return asString(o.url ?? o.src ?? o.href ?? o.large ?? o.medium ?? o.original ?? '');
  }
  return '';
}

function productLike(obj: Record<string, unknown>): ItemDraft | null {
  const title = asString(pick(obj, TITLE_KEYS));
  const url = asString(pick(obj, URL_KEYS));
  const image = asString(pick(obj, IMAGE_KEYS));
  if (!title || title.length > 300 || (!/^https?:\/\//.test(url) && !/^https?:\/\//.test(image))) return null;
  const priceValue = pick(obj, PRICE_KEYS);
  const nested = priceValue && typeof priceValue === 'object' ? (priceValue as Record<string, unknown>) : null;
  const offers = obj.offers ? offerPrice(obj.offers) : null;
  const rawPrice = nested ? (nested.amount ?? nested.value) : priceValue;
  return sanitizeDraft({
    title: decodeEntities(title),
    url: /^https?:\/\//.test(url) ? url : null,
    imageUrl: /^https?:\/\//.test(image) ? image : null,
    price: offers?.price ?? (typeof rawPrice === 'number' || typeof rawPrice === 'string' ? rawPrice : null),
    currency: offers?.currency ?? asString(nested?.currency ?? nested?.currencyCode ?? pick(obj, CURRENCY_KEYS)),
    note: asString(pick(obj, NOTE_KEYS)).slice(0, 1000),
  });
}

/** The largest array in some JSON whose members mostly look like products. */
export function productsInState(state: unknown): ItemDraft[] {
  let best: ItemDraft[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number) => {
    if (!value || typeof value !== 'object' || depth > 14 || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      if (value.length >= 1 && typeof value[0] === 'object') {
        const drafts = value
          .map((entry) => (entry && typeof entry === 'object' ? productLike(entry as Record<string, unknown>) ?? productLike(((entry as Record<string, unknown>).product ?? (entry as Record<string, unknown>).item ?? {}) as Record<string, unknown>) : null))
          .filter((d): d is ItemDraft => d !== null);
        if (drafts.length > best.length && drafts.length >= value.length * 0.6) best = drafts;
      }
      value.forEach((entry) => walk(entry, depth + 1));
      return;
    }
    for (const entry of Object.values(value as Record<string, unknown>)) walk(entry, depth + 1);
  };
  walk(state, 0);
  return best;
}

function embeddedStates(html: string): unknown[] {
  const states: unknown[] = [];
  const nextData = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (nextData) {
    try {
      states.push(JSON.parse(nextData));
    } catch {}
  }
  for (const m of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      states.push(JSON.parse(m[1]));
    } catch {}
  }
  return states;
}

export function extractListFromHtml(html: string, pageUrl: string): { title: string; items: ItemDraft[] } {
  const nodes = jsonLdNodes(html);
  const fromLd = nodes
    .filter((node) => isType(node, 'Product'))
    .map((node) => productFromLd(node, pageUrl))
    .map((d) => (d ? sanitizeDraft(d) : null))
    .filter((d): d is ItemDraft => d !== null);

  let items = fromLd;
  for (const state of embeddedStates(html)) {
    const found = productsInState(state);
    if (found.length > items.length) items = found;
  }

  const listNode = nodes.find((node) => isType(node, 'ItemList') || isType(node, 'CollectionPage'));
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = decodeEntities(String(listNode?.name || ogTitle || titleTag || 'Imported wishlist')).replace(/\s+/g, ' ').trim();
  return { title, items };
}

function looksBlocked(status: number, html: string): boolean {
  return status === 403 || status === 429 || status === 503 || /<title>Just a moment\.\.\.<\/title>|cf-chl|Vercel Security Checkpoint/i.test(html.slice(0, 5000));
}

export function isWishlistComUrl(url: URL): boolean {
  return /(^|\.)wishlist\.com$/.test(url.hostname);
}

export async function importPage(url: URL, source: ImportSource): Promise<ImportedList> {
  const page = await safeFetch(url.toString());
  if (looksBlocked(page.status, page.text)) {
    throw new NeedsBrowserImportError(source, `${source === 'wishlistcom' ? 'Wishlist.com' : 'That site'} only lets real browsers in.`);
  }
  if (page.status >= 400) throw new ImportError(`That page answered with an error (${page.status}).`);

  const { title, items } = extractListFromHtml(page.text, page.url);
  if (items.length === 0) {
    throw new NeedsBrowserImportError(source, 'We could not find any items on that page from our server.');
  }
  return { source, sourceUrl: page.url, title, description: '', ownerName: null, related: [], items };
}
