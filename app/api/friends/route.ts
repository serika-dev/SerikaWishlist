import { accountsGetUser } from '@/lib/accounts';
import { fail, handler, ok, readJson, requireString } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { friendOverview, requestFriend, resolveUsers } from '@/lib/friends';
import { getPublicUser } from '@/lib/owners';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const user = await requireUser();
  return ok(await friendOverview(user.id));
});

/** Add a friend by Serika username or email. The request lives in serika-accounts. */
export const POST = handler(async (request: Request) => {
  const user = await requireUser();
  const body = await readJson(request);
  const who = requireString(body.who ?? body.username ?? body.id, 'Username or email', { max: 320 }).replace(/^@/, '');

  let targetId: string | null = null;
  if (typeof body.id === 'string') {
    targetId = body.id;
  } else if (who.includes('@')) {
    const result = await accountsGetUser(who.toLowerCase());
    targetId = result.ok && result.data.user?.id ? String(result.data.user.id) : null;
  } else {
    targetId = (await getPublicUser({ username: who }))?.id ?? null;
  }
  if (!targetId) {
    return fail(
      who.includes('@')
        ? 'No Serika account uses that email.'
        : `We don't know @${who} yet. Try their email, or ask them to open Serika Wishlist once.`,
      404
    );
  }
  if (targetId === user.id) return fail("That's you!");

  const [target] = await resolveUsers([targetId]);
  if (!target) return fail('That Serika account could not be found.', 404);
  const state = await requestFriend(user.id, targetId);
  return ok({ state, user: target });
});
