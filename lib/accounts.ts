import { config } from './config';

/**
 * Client for the serika-accounts service (accounts.serika.dev).
 *
 * SerikaWishlist never stores passwords: login/registration are proxied to the
 * accounts service, and the session JWT it returns is validated on our side
 * through the internal service-key endpoint, which is also where the profile
 * comes from.
 */

const REQUEST_TIMEOUT_MS = 8_000;

export interface AccountsUser {
  id: string;
  email?: string;
  username: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  rank?: string;
}

export interface AccountsResult<T> {
  ok: boolean;
  status: number;
  data: T & { error?: string; message?: string; code?: string };
}

async function accountsFetchOnce<T>(
  path: string,
  init: RequestInit & { internal?: boolean }
): Promise<AccountsResult<T>> {
  const { internal, ...requestInit } = init;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requestInit.headers as Record<string, string> | undefined),
  };
  if (internal) {
    headers['x-service-key'] = config.ACCOUNTS_SERVICE_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.ACCOUNTS_URL}${path}`, {
      ...requestInit,
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    const data = (await response.json().catch(() => ({}))) as T & { error?: string };
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Transient network failures are retried once; if they persist we return a
 * normalized 503 so routes can say "accounts is down" instead of throwing.
 */
async function accountsFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit & { internal?: boolean } = {}
): Promise<AccountsResult<T>> {
  try {
    return await accountsFetchOnce<T>(path, init);
  } catch {
    try {
      return await accountsFetchOnce<T>(path, init);
    } catch (error) {
      console.error(`[accounts] unreachable (${path}):`, error);
      return {
        ok: false,
        status: 503,
        data: {
          error: 'The Serika Accounts service is temporarily unavailable. Please try again.',
        } as T & { error?: string },
      };
    }
  }
}

export function accountsLogin(
  body: { email: string; password: string; twoFactorCode?: string },
  client?: { userAgent?: string; ip?: string }
) {
  return accountsFetch<{
    success?: boolean;
    token?: string;
    refreshToken?: string;
    user?: AccountsUser;
    banned?: boolean;
    banInfo?: { reason?: string; expiresAt?: string | null };
  }>('/api/auth/login', {
    method: 'POST',
    headers: {
      'User-Agent': client?.userAgent || 'SerikaWishlist/1.0',
      'X-Forwarded-For': client?.ip || '',
    },
    body: JSON.stringify({ ...body, rememberMe: true, productId: 'serika-wishlist' }),
  });
}

export function accountsRegister(body: {
  email: string;
  username: string;
  password: string;
  dateOfBirth?: string;
}) {
  return accountsFetch<{ success?: boolean; user?: AccountsUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function accountsRefresh(refreshToken: string) {
  return accountsFetch<{ success?: boolean; token?: string; refreshToken?: string }>(
    '/api/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }
  );
}

export function accountsForgotPassword(email: string) {
  return accountsFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function accountsResendVerification(email: string) {
  return accountsFetch('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Validate a session JWT. Returns the full user record including `isAdmin`,
 * and refuses banned accounts.
 */
export function accountsVerify(token: string) {
  return accountsFetch<{
    valid?: boolean;
    user?: AccountsUser;
    banned?: boolean;
    banInfo?: { reason?: string; expiresAt?: string | null };
  }>('/internal/verify', {
    method: 'POST',
    internal: true,
    body: JSON.stringify({ token, checkBan: true }),
  });
}

/** Look up an account by id, email or username. */
export function accountsGetUser(identifier: string) {
  const body = identifier.includes('@')
    ? { email: identifier.toLowerCase() }
    : { id: identifier };
  return accountsFetch<{ user?: AccountsUser }>('/internal/get-user', {
    method: 'POST',
    internal: true,
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// The interchange graph: friends shared by every Serika product (SerikaCord,
// Social, serika.dev...), keyed by accounts user id.
// ---------------------------------------------------------------------------

export function graphFriends(accountsId: string) {
  return accountsFetch<{ friends?: string[]; incoming?: string[]; outgoing?: string[] }>(
    `/internal/graph/friends/${encodeURIComponent(accountsId)}`,
    { method: 'GET', internal: true }
  );
}

/** Ask (or, if they already asked, accept). status 1 forces accepted. */
export function graphFriendRequest(a: string, b: string, requestedBy: string, status?: 1) {
  return accountsFetch<{ status?: 'pending' | 'accepted' | 'already_friends'; error?: string }>('/internal/graph/friends', {
    method: 'POST',
    internal: true,
    body: JSON.stringify({ a, b, requestedBy, ...(status ? { status } : {}) }),
  });
}

export function graphFriendRemove(a: string, b: string) {
  return accountsFetch<{ status?: string }>('/internal/graph/friends', {
    method: 'DELETE',
    internal: true,
    body: JSON.stringify({ a, b }),
  });
}
