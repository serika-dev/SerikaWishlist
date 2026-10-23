import { clientIp, fail, handler, ok, rateLimited, readJson, requireString } from '@/lib/api';
import { extractProduct } from '@/lib/extract';
import { cleanUrl } from '@/lib/lists';
import { FetchBlockedError, safeFetch } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Paste a product link, get its name, photo and price. Many stores answer a
 * server; the ones that do not still get added with just the link (and the
 * bookmarklet reads them from the browser instead).
 */
export const POST = handler(async (request: Request) => {
  if (rateLimited(`unfurl:${clientIp(request)}`, 60, 10 * 60 * 1000)) return fail('Too many links at once. Wait a minute.', 429);
  const body = await readJson(request);
  const raw = requireString(body.url, 'Link', { max: 2048 });
  const url = cleanUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!url) return fail('That is not a web link.');

  try {
    const page = await safeFetch(url);
    if (page.status >= 400 || !/html|xml/i.test(page.contentType)) {
      return ok({ product: { url }, partial: true });
    }
    const product = extractProduct(page.text, page.url);
    product.url = url;
    const blocked = /captcha|robot check|access denied|just a moment/i.test(product.title || '');
    return ok({ product: blocked ? { url } : product, partial: blocked || !product.title });
  } catch (error) {
    if (error instanceof FetchBlockedError) return fail(error.message);
    return ok({ product: { url }, partial: true });
  }
});
