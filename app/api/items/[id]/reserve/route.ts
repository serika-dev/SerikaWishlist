import { clientIp, fail, handler, ok, rateLimited, readJson } from '@/lib/api';
import { canEdit, canView, getItem, reserveItem, unreserveItem } from '@/lib/lists';
import { getViewer, gifterId } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** A gift-giver says "I'm getting this", so nobody else buys it too. */
export const POST = handler(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const [item, viewer] = await Promise.all([getItem(id), getViewer()]);
  if (!item || !(await canView(item.list, viewer))) return fail('That item does not exist.', 404);
  if (canEdit(item.list, viewer)) return fail('This is your own wishlist. Mark it as received instead.');
  if (rateLimited(`reserve:${clientIp(request)}`, 40, 60 * 60 * 1000)) return fail('Slow down a little.', 429);

  const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name
      : viewer.user
        ? viewer.user.displayName || viewer.user.username
        : '';
  const result = await reserveItem(id, (await gifterId(true))!, name);
  if (result === 'full') return fail('Someone already got this one.', 409);
  return ok({ success: true });
});

export const DELETE = handler(async (_request: Request, { params }: Ctx) => {
  const { id } = await params;
  const gifter = await gifterId(false);
  if (gifter) await unreserveItem(id, gifter);
  return ok({ success: true });
});
