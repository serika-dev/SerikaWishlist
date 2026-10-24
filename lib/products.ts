import { decodeEntities, extractProduct } from './extract';
import { cleanUrl, sanitizeDraft } from './lists';
import { FetchBlockedError, safeFetch } from './safe-fetch';
import type { ItemDraft } from './types';

/**
 * One product from a link. Stores whose pages are empty shells (single-page
 * apps behind bot checks) are read through their own product API first; every
 * other link goes through the page's HTML metadata.
 */

export interface FetchedProduct {
  product: Partial<ItemDraft> & { url: string };
  /** We couldn't read the name (and so probably nothing useful). */
  partial: boolean;
}

/** AmiAmi (amiami.com): the site is a JS app that 403s servers, but its item API answers. */
async function amiami(url: URL): Promise<ItemDraft | null> {
  if (!/(^|\.)amiami\.com$/.test(url.hostname)) return null;
  const gcode = url.searchParams.get('gcode');
  const scode = url.searchParams.get('scode');
  if (!gcode && !scode) return null;
  const query = gcode ? `gcode=${encodeURIComponent(gcode)}` : `scode=${encodeURIComponent(scode!)}`;
  const response = await safeFetch(`https://api.amiami.com/api/v1.0/item?${query}&lang=eng`, {
    accept: 'application/json',
    headers: { 'X-User-Key': 'amiami_dev' },
    maxBytes: 500_000,
  });
  if (response.status !== 200) return null;
  let item: Record<string, unknown> | undefined;
  try {
    item = (JSON.parse(response.text) as { item?: Record<string, unknown> }).item;
  } catch {
    return null;
  }
  if (!item) return null;

  // sname carries the condition for pre-owned listings ("(Pre-owned ITEM:A/BOX:B)…");
  // the trailing release status is noise on a wishlist.
  const name = decodeEntities(String(item.sname || item.gname || ''))
    .replace(/\((Released|Pre-order|Preorder|Back-order|Backorder)\)\s*$/i, '')
    .trim();
  const image = String(item.main_image_url || item.thumb_url || '');
  return sanitizeDraft({
    title: name,
    url: url.toString(),
    imageUrl: image ? `https://img.amiami.com${image.startsWith('/') ? '' : '/'}${image}` : null,
    price: typeof item.price === 'number' ? item.price : null,
    currency: 'JPY',
    store: 'AmiAmi',
  });
}

const STORE_READERS = [amiami];

export async function fetchProduct(rawUrl: string): Promise<FetchedProduct> {
  const url = cleanUrl(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  if (!url) throw new Error('That is not a web link.');
  const parsed = new URL(url);

  for (const reader of STORE_READERS) {
    try {
      const product = await reader(parsed);
      if (product?.title) return { product: { ...product, url }, partial: false };
    } catch {
      // Fall through to the page itself.
    }
  }

  try {
    const page = await safeFetch(url);
    if (page.status >= 400 || !/html|xml/i.test(page.contentType)) return { product: { url }, partial: true };
    const product = extractProduct(page.text, page.url);
    const blocked = /captcha|robot check|access denied|just a moment|attention required/i.test(product.title || '');
    if (blocked || !product.title) return { product: { url }, partial: true };
    return { product: { ...product, url }, partial: false };
  } catch (error) {
    if (error instanceof FetchBlockedError) throw error;
    return { product: { url }, partial: true };
  }
}
