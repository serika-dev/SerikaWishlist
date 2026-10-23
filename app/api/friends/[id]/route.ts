import { handler, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { acceptFriend, removeFriend } from '@/lib/friends';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Accept their request. */
export const POST = handler(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return ok({ state: await acceptFriend(user.id, id) });
});

/** Decline, cancel or unfriend. */
export const DELETE = handler(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await removeFriend(user.id, id);
  return ok({ state: 'none' });
});
