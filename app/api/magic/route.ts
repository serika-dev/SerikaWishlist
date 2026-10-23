import { clientIp, fail, handler, ok, rateLimited, readJson, requireString } from '@/lib/api';
import { clearGuestSession, startGuestSession } from '@/lib/guest';
import { MagicLinkError, redeemMagicLink } from '@/lib/magic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Redeem a magic link. A POST, from a button on /magic/<token>, so mail
 * scanners that open every link cannot use it up.
 */
export const POST = handler(async (request: Request) => {
  if (rateLimited(`magic:${clientIp(request)}`, 20, 15 * 60 * 1000)) {
    return fail('Too many attempts. Wait a few minutes and try again.', 429);
  }
  const body = await readJson(request);
  const token = requireString(body.token, 'Token', { max: 128 });

  try {
    const result = await redeemMagicLink(token);
    if (result.account) {
      // Everything now lives in the account; this browser's guest is done with.
      await clearGuestSession();
      return ok({ account: { username: result.account.username }, moved: result.moved, email: result.email });
    }
    await startGuestSession(result.guestId);
    return ok({ returnTo: result.returnTo, email: result.email });
  } catch (error) {
    if (error instanceof MagicLinkError) return fail(error.message, 400);
    throw error;
  }
});
