import { handler, ok } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth';
import { clearGuestSession } from '@/lib/guest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Signs out of the account and forgets the guest on this device. */
export const POST = handler(async () => {
  await clearSessionCookie();
  await clearGuestSession();
  return ok({ success: true });
});
