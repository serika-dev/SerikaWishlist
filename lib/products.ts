import { decodeEntities, extractProduct, isType, jsonLdNodes, offerPrice } from './extract';
import { cleanUrl, sanitizeDraft } from './lists';
import { FetchBlockedError, safeFetch } from './safe-fetch';
import type { ItemDraft, ProductVariant } from './types';

/**
 * One product from a link. Stores whose pages are empty shells (single-page
 * apps behind bot checks) are read through their own product API first; every
 * other link goes through the page's HTML metadata.
 */

export interface FetchedProduct {
  product: Partial<ItemDraft> & { url: string };
  /** The versions a product comes in, when there's more than one to choose from. */
  variants: ProductVariant[];
  /** We couldn't read the name (and so probably nothing useful). */
  partial: boolean;
}

/** AmiAmi (amiami.com): the site is a JS app that 403s servers, but its item API answers. */
async function amiami(url: URL): Promise<StoreResult | null> {
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
  const product = sanitizeDraft({
    title: name,
    url: url.toString(),
    imageUrl: image ? `https://img.amiami.com${image.startsWith('/') ? '' : '/'}${image}` : null,
    price: typeof item.price === 'number' ? item.price : null,
    currency: 'JPY',
    store: 'AmiAmi',
  });
  return product ? { product, variants: [] } : null;
}

type StoreResult = { product: ItemDraft; variants: ProductVariant[] };

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown | null> {
  const response = await safeFetch(url, { accept: 'application/json', headers, maxBytes: 2_000_000 });
  if (response.status !== 200) return null;
  try {
    return JSON.parse(response.text);
  } catch {
    return null;
  }
}

/**
 * Tokyo Otaku Mode (otakumode.com/shop/<id>): one product, several SKUs (the
 * Seia / Nagisa / Mika of a plush line), each with its own name, photo, price
 * and stock. The page draws its picker from /shop/getProduct.
 */
async function tom(url: URL): Promise<StoreResult | null> {
  if (!/(^|\.)otakumode\.com$/.test(url.hostname)) return null;
  const id = url.pathname.match(/^\/shop\/([0-9a-f]{24})/)?.[1];
  if (!id) return null;
  const data = (await getJson(`https://otakumode.com/shop/getProduct?_id=${id}`, { 'X-Requested-With': 'XMLHttpRequest' })) as {
    titles?: { en_us?: string };
    images?: { source?: string }[];
    skus?: {
      titles?: { en_us?: string };
      short_titles?: { en_us?: string };
      price?: number;
      sale_price?: number | null;
      image?: { source?: string };
      is_out_of_stock?: boolean;
      is_discontinued?: boolean;
    }[];
  } | null;
  if (!data?.skus?.length) return null;
  const image = (source?: string) => (source ? `https://resize.cdn.otakumode.com/full${source.startsWith('/') ? '' : '/'}${source}` : null);
  const variants: ProductVariant[] = data.skus.map((sku) => ({
    name: decodeEntities(sku.short_titles?.en_us || sku.titles?.en_us || '').trim(),
    imageUrl: image(sku.image?.source),
    price: sku.sale_price ?? sku.price ?? null,
    currency: 'USD',
    url: url.toString(),
    soldOut: Boolean(sku.is_out_of_stock || sku.is_discontinued),
  }));
  const first = variants[0];
  const product = sanitizeDraft({
    title: decodeEntities(data.titles?.en_us || data.skus[0].titles?.en_us || ''),
    url: url.toString(),
    imageUrl: image(data.images?.[0]?.source) ?? first.imageUrl,
    price: first.price,
    currency: 'USD',
    store: 'Tokyo Otaku Mode',
  });
  if (!product) return null;
  return { product, variants: variants.length > 1 ? variants.filter((v) => v.name) : [] };
}

/**
 * Shopify stores (a large share of figure and merch shops) publish every
 * product as /products/<handle>.js, variants included. Only tried on
 * /products/ links, so other sites cost one cheap 404 at most.
 */
async function shopify(url: URL): Promise<StoreResult | null> {
  const handle = url.pathname.match(/\/products\/([^/?#]+)/)?.[1];
  if (!handle) return null;
  const variantId = url.searchParams.get('variant');
  const data = (await getJson(`${url.origin}/products/${handle}.js`)) as {
    title?: string;
    featured_image?: string;
    vendor?: string;
    variants?: { id?: number; title?: string; price?: number; available?: boolean; featured_image?: { src?: string } | null }[];
  } | null;
  if (!data?.title || !Array.isArray(data.variants)) return null;
  const abs = (src?: string | null) => (src ? (src.startsWith('//') ? `https:${src}` : src) : null);
  const currency = (await getJson(`${url.origin}/cart.js`) as { currency?: string } | null)?.currency ?? null;
  const variants: ProductVariant[] = data.variants.map((v) => ({
    name: decodeEntities(v.title || '').trim(),
    imageUrl: abs(v.featured_image?.src) ?? abs(data.featured_image),
    price: typeof v.price === 'number' ? v.price / 100 : null,
    currency,
    url: v.id ? `${url.origin}/products/${handle}?variant=${v.id}` : url.toString(),
    soldOut: v.available === false,
  }));
  const chosen = (variantId && data.variants.findIndex((v) => String(v.id) === variantId)) || 0;
  const pick = variants[chosen >= 0 ? chosen : 0];
  const product = sanitizeDraft({
    title: decodeEntities(data.title),
    url: url.toString(),
    imageUrl: abs(data.featured_image) ?? pick?.imageUrl,
    price: pick?.price ?? null,
    currency,
    store: data.vendor || null,
  });
  if (!product) return null;
  const real = variants.filter((v) => v.name && !/^default title$/i.test(v.name));
  return { product, variants: real.length > 1 ? real : [] };
}

/** schema.org ProductGroup with hasVariant, which many non-Shopify stores publish. */
function ldVariants(html: string, pageUrl: string): ProductVariant[] {
  const group = jsonLdNodes(html).find((node) => isType(node, 'ProductGroup'));
  const list = Array.isArray(group?.hasVariant) ? (group!.hasVariant as Record<string, unknown>[]) : [];
  if (list.length < 2) return [];
  const groupName = String(group!.name || '');
  return list
    .map((v) => {
      const { price, currency } = offerPrice(v.offers);
      const raw = decodeEntities(String(v.name || ''));
      const name = (groupName && raw.startsWith(groupName) ? raw.slice(groupName.length) : raw).replace(/^[\s\-–—:|,/]+/, '').trim() || raw;
      const offers = (Array.isArray(v.offers) ? v.offers[0] : v.offers) as Record<string, unknown> | undefined;
      const image = Array.isArray(v.image) ? v.image[0] : v.image;
      return {
        name,
        imageUrl: typeof image === 'string' ? cleanUrl(new URL(image, pageUrl).toString()) : null,
        price,
        currency,
        url: typeof v.url === 'string' ? cleanUrl(new URL(v.url, pageUrl).toString()) : null,
        soldOut: /OutOfStock|SoldOut|Discontinued/i.test(String(offers?.availability || '')),
      };
    })
    .filter((v) => v.name);
}

const STORE_READERS = [amiami, tom, shopify];

export async function fetchProduct(rawUrl: string): Promise<FetchedProduct> {
  const url = cleanUrl(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  if (!url) throw new Error('That is not a web link.');
  const parsed = new URL(url);

  for (const reader of STORE_READERS) {
    try {
      const result = await reader(parsed);
      if (result?.product.title) return { product: { ...result.product, url }, variants: result.variants, partial: false };
    } catch {
      // Fall through to the page itself.
    }
  }

  try {
    const page = await safeFetch(url);
    if (page.status >= 400 || !/html|xml/i.test(page.contentType)) return { product: { url }, variants: [], partial: true };
    const product = extractProduct(page.text, page.url);
    const blocked = /captcha|robot check|access denied|just a moment|attention required/i.test(product.title || '');
    if (blocked || !product.title) return { product: { url }, variants: [], partial: true };
    return { product: { ...product, url }, variants: ldVariants(page.text, page.url), partial: false };
  } catch (error) {
    if (error instanceof FetchBlockedError) throw error;
    return { product: { url }, variants: [], partial: true };
  }
}
