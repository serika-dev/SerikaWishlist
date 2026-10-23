import { cleanCurrency, cleanPrice, cleanUrl, storeFromUrl } from './lists';
import { currencyFromSymbol } from './currency';
import type { ItemDraft } from './types';

/**
 * Pull a product out of a page's HTML: JSON-LD first (most stores publish a
 * schema.org Product), then OpenGraph / product meta tags, then microdata,
 * then a few store-specific fallbacks. No DOM on the server, so this works on
 * the raw markup with small, forgiving regexes.
 */

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", hellip: '…', ndash: '–', mdash: '—', euro: '€', pound: '£', yen: '¥', trade: '™', reg: '®', copy: '©',
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  }
  return out;
}

function metaMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property || a.name || a.itemprop || '').toLowerCase();
    const value = a.content ?? '';
    if (key && value && !map.has(key)) map.set(key, value.trim());
  }
  return map;
}

/** Every JSON-LD node in the page, flattened through @graph and arrays. */
export function jsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(walk);
    const obj = value as Record<string, unknown>;
    nodes.push(obj);
    if (obj['@graph']) walk(obj['@graph']);
    if (obj.mainEntity) walk(obj.mainEntity);
    if (obj.itemListElement) walk(obj.itemListElement);
    if (obj.item) walk(obj.item);
  };
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1].trim()));
    } catch {
      // Stores ship broken JSON-LD surprisingly often; skip it.
    }
  }
  return nodes;
}

export function isType(node: Record<string, unknown>, type: string): boolean {
  const t = node['@type'];
  return t === type || (Array.isArray(t) && t.includes(type));
}

function firstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return firstString(obj.url ?? obj.contentUrl ?? obj['@id'] ?? obj.name ?? '');
  }
  return '';
}

/** price/currency from a schema.org offers value (Offer, AggregateOffer or an array). */
export function offerPrice(offers: unknown): { price: number | null; currency: string | null } {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const offer = raw as Record<string, unknown>;
    const spec = (Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification) as Record<string, unknown> | undefined;
    const price = cleanPrice(offer.price ?? offer.lowPrice ?? spec?.price ?? null);
    const currency = cleanCurrency(offer.priceCurrency ?? spec?.priceCurrency ?? null);
    if (price !== null) return { price, currency };
  }
  return { price: null, currency: null };
}

export function productFromLd(node: Record<string, unknown>, baseUrl: string): ItemDraft | null {
  const title = decodeEntities(firstString(node.name)).trim();
  if (!title) return null;
  const { price, currency } = offerPrice(node.offers);
  const image = firstString(node.image);
  const url = firstString(node.url) || baseUrl;
  return {
    title,
    url: cleanUrl(absolute(url, baseUrl)),
    imageUrl: image ? cleanUrl(absolute(image, baseUrl)) : null,
    price,
    currency,
  };
}

function absolute(value: string, base: string): string {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function textOf(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
}

/** Store-specific fallbacks for pages that publish little metadata. */
function storeSpecific(html: string, host: string): Partial<ItemDraft> {
  if (/amazon\./.test(host)) {
    const title = textOf(html, /<span[^>]*id="productTitle"[^>]*>([\s\S]*?)<\/span>/i);
    const hires = html.match(/data-old-hires="([^"]+)"/i)?.[1] || html.match(/"hiRes":"([^"]+)"/)?.[1] || html.match(/id="landingImage"[^>]*src="([^"]+)"/i)?.[1];
    const priceText = textOf(html, /<span class="a-offscreen">([^<]+)<\/span>/i);
    return { title, imageUrl: hires || null, price: cleanPrice(priceText), currency: currencyFromSymbol(priceText, host) };
  }
  return {};
}

export function extractProduct(html: string, pageUrl: string): ItemDraft {
  const host = (() => {
    try {
      return new URL(pageUrl).hostname;
    } catch {
      return '';
    }
  })();
  const meta = metaMap(html);
  const ldProduct = jsonLdNodes(html).find((node) => isType(node, 'Product') || isType(node, 'ProductGroup'));
  const fromLd = ldProduct ? productFromLd(ldProduct, pageUrl) : null;
  const special = storeSpecific(html, host);

  const metaPrice = cleanPrice(
    meta.get('og:price:amount') || meta.get('product:price:amount') || meta.get('price') || null
  );
  const metaCurrency = cleanCurrency(
    meta.get('og:price:currency') || meta.get('product:price:currency') || meta.get('pricecurrency') || null
  );

  const title =
    special.title ||
    fromLd?.title ||
    meta.get('og:title') ||
    meta.get('twitter:title') ||
    textOf(html, /<title[^>]*>([\s\S]*?)<\/title>/i);

  const image =
    special.imageUrl ||
    fromLd?.imageUrl ||
    meta.get('og:image:secure_url') ||
    meta.get('og:image') ||
    meta.get('twitter:image') ||
    meta.get('image') ||
    null;

  const price = special.price ?? fromLd?.price ?? metaPrice ?? null;
  const currency = special.currency ?? fromLd?.currency ?? metaCurrency ?? null;
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];

  const host_ = storeFromUrl(pageUrl) || '';
  const siteName = meta.get('og:site_name') || '';
  const store = siteName && siteName.length <= 40 && siteName !== title ? siteName : host_;
  return {
    title: tidyTitle(decodeEntities(title || ''), [siteName, store, host_.split('.')[0]]).slice(0, 200),
    url: cleanUrl(pageUrl) || cleanUrl(canonical ? absolute(canonical, pageUrl) : null),
    imageUrl: image ? cleanUrl(absolute(image, pageUrl)) : null,
    price,
    currency,
    store,
  };
}

/** "Frieren LP | bol" → "Frieren LP": drop a trailing site name. */
export function tidyTitle(title: string, siteNames: string[]): string {
  let out = title.replace(/\s+/g, ' ').trim();
  const names = siteNames.filter(Boolean).map((n) => n.toLowerCase());
  const m = out.match(/^(.{6,}?)\s+[|–—·:-]\s+([^|–—·]{2,40})$/);
  if (m && names.some((n) => m[2].toLowerCase().includes(n) || n.includes(m[2].toLowerCase().trim()))) out = m[1];
  return out;
}
