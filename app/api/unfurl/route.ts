import { clientIp, fail, handler, ok, rateLimited, readJson, requireString } from '@/lib/api';
import { fetchProduct } from '@/lib/products';
import { FetchBlockedError } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Paste a product link, get its name, photo and price. Most stores answer a
 * server (some through their own product API); the ones that do not still get
 * added with just the link, and the bookmarklet reads them from the browser.
 */
export const POST = handler(async (request: Request) => {
  if (rateLimited(`unfurl:${clientIp(request)}`, 60, 10 * 60 * 1000)) return fail('Too many links at once. Wait a minute.', 429);
  const body = await readJson(request);
  const raw = requireString(body.url, 'Link', { max: 2048 });
  try {
    return ok(await fetchProduct(raw));
  } catch (error) {
    if (error instanceof FetchBlockedError || (error as Error).message === 'That is not a web link.') {
      return fail((error as Error).message);
    }
    throw error;
  }
});
