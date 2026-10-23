import { accountsRegister } from '@/lib/accounts';
import { fail, handler, ok, readJson, requireString } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Create a Serika account. The accounts service sends the verification email
 * and refuses login until it is confirmed, so we do not issue a session here.
 */
export const POST = handler(async (request: Request) => {
  const body = await readJson(request);
  const email = requireString(body.email, 'Email', { max: 320 }).toLowerCase();
  const username = requireString(body.username, 'Username', { min: 3, max: 32 });
  const password = requireString(body.password, 'Password', { min: 8, max: 200 });

  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return fail('Username may only contain letters, numbers, dots, dashes and underscores.');
  }

  const result = await accountsRegister({ email, username, password });

  if (!result.ok) {
    return fail(
      result.data.error || 'Could not create your account.',
      result.status === 503 ? 503 : result.status || 400
    );
  }

  return ok({
    success: true,
    message: 'Account created. Check your email to verify it, then sign in.',
  });
});
