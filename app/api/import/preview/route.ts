import { clientIp, fail, handler, ok, rateLimited, readJson, requireString } from '@/lib/api';
import { detectSource, fetchImport, ImportError, NeedsBrowserImportError, SOURCE_LABELS } from '@/lib/importers';
import { FetchBlockedError } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Read a list from Throne / MyWishlist / Wishlist.com and show it before saving. */
export const POST = handler(async (request: Request) => {
  if (rateLimited(`import:${clientIp(request)}`, 20, 10 * 60 * 1000)) return fail('Too many imports at once. Wait a minute.', 429);
  const body = await readJson(request);
  const raw = requireString(body.url, 'Link', { max: 2048 });

  try {
    detectSource(raw);
    const list = await fetchImport(raw);
    if (list.items.length === 0) return fail(`That ${SOURCE_LABELS[list.source]} list is empty.`);
    return ok({ list });
  } catch (error) {
    if (error instanceof NeedsBrowserImportError) {
      return ok({ needsBrowser: true, source: error.source, label: SOURCE_LABELS[error.source], message: error.message });
    }
    if (error instanceof ImportError || error instanceof FetchBlockedError) return fail(error.message);
    console.error('[import] preview failed:', error);
    return fail('Could not read that list. Check the link, or use the bookmarklet on the list page.');
  }
});
