import { clientIp, fail, handler, ok, rateLimited, readJson, requireString } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { getCurrentGuest } from '@/lib/guest';
import { requestMagicLink } from '@/lib/magic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Email a magic link. Used both to save this browser's guest lists to an
 * address and to get back into lists saved earlier. The answer is the same
 * whether or not we know the address.
 */
export const POST = handler(async (request: Request) => {
  const body = await readJson(request);
  const email = requireString(body.email, 'Email', { max: 320 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('That email address does not look right.');

  if (await getSessionUser()) {
    return fail('You are signed in with your Serika account, so your wishlists are already saved there.');
  }
  if (rateLimited(`access:${clientIp(request)}`, 8, 60 * 60 * 1000)) {
    return fail('Too many links requested from here. Try again in a little while.', 429);
  }

  const guest = await getCurrentGuest();
  await requestMagicLink({
    email,
    guestId: guest && !guest.claimedUserId && !guest.email ? guest.id : null,
    returnTo: typeof body.returnTo === 'string' ? body.returnTo : '/lists',
  });

  return ok({ success: true });
});
