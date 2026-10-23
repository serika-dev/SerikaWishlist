import { accountsLogin } from '@/lib/accounts';
import { clientInfo, fail, handler, ok, readJson, requireString } from '@/lib/api';
import { resolveToken, setSessionCookie } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { clearGuestSession, getCurrentGuest } from '@/lib/guest';
import { moveGuestListsToUser } from '@/lib/owners';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sign in through serika-accounts (a 30-day session). Wishlists made as a
 * guest in this browser come along into the account, and lists saved under
 * the account's email anywhere else are pulled in by resolveToken.
 */
export const POST = handler(async (request: Request) => {
  const body = await readJson(request);
  const email = requireString(body.email, 'Email', { max: 320 }).toLowerCase();
  const password = requireString(body.password, 'Password', { max: 200 });
  const twoFactorCode =
    typeof body.twoFactorCode === 'string' && body.twoFactorCode.trim() ? body.twoFactorCode.trim() : undefined;

  const result = await accountsLogin({ email, password, twoFactorCode }, clientInfo(request));

  if (result.data.code === 'TWO_FACTOR_REQUIRED') {
    return fail(result.data.error || '2FA code required', 401, { code: 'TWO_FACTOR_REQUIRED' });
  }
  if (!result.ok || !result.data.token) {
    return fail(
      result.data.error || 'Could not sign you in.',
      result.status === 503 ? 503 : result.status || 400,
      result.data.code ? { code: result.data.code } : undefined
    );
  }
  if (result.data.banned) {
    return fail(`Your Serika account is suspended: ${result.data.banInfo?.reason || 'no reason given'}.`, 403, {
      code: 'ACCOUNT_BANNED',
    });
  }

  await setSessionCookie(result.data.token);
  const user = await resolveToken(result.data.token);

  let moved = 0;
  const guest = await getCurrentGuest();
  if (user && guest && !guest.claimedUserId) {
    moved = await transaction((client) => moveGuestListsToUser(guest.id, user.id, client));
  }
  if (user && guest) await clearGuestSession();

  return ok({ success: true, user, moved });
});
