import { NextResponse } from 'next/server';
import { AuthError } from './errors';

/** Shared helpers so every route handler returns the same error envelope. */

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data as Record<string, unknown>, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Wrap a handler so AuthError maps to 401/403 and anything unexpected becomes a
 * logged 500 instead of leaking a stack trace to the client.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AuthError) {
        return fail(error.message, error.status);
      }
      if (error instanceof ValidationError) {
        return fail(error.message, 400);
      }
      console.error('[api] unhandled error:', error);
      return fail('Something went wrong on our end. Please try again.', 500);
    }
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError('Request body must be valid JSON.');
  }
}

export function requireString(
  value: unknown,
  field: string,
  { min = 1, max = 5000 }: { min?: number; max?: number } = {}
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ValidationError(
      min === 1 ? `${field} is required.` : `${field} must be at least ${min} characters.`
    );
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be ${max} characters or fewer.`);
  }
  return trimmed;
}

export function optionalString(value: unknown, field: string, max = 5000): string {
  if (value === undefined || value === null || value === '') return '';
  return requireString(value, field, { min: 0, max });
}

export function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireEnum(value, allowed, field);
}

export function clientInfo(request: Request): { userAgent?: string; ip?: string } {
  return {
    userAgent: request.headers.get('user-agent') || undefined,
    ip:
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      undefined,
  };
}

export function clientIp(request: Request): string {
  return clientInfo(request).ip || 'unknown';
}

// ---------------------------------------------------------------------------
// In-memory rate limiting. One process serves the app on Coolify, so a
// sliding window in memory is enough to stop floods of emails and fetches.
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __serikaWishlistRate: Map<string, number[]> | undefined;
}

/** Returns true when `key` has already used `limit` hits within `windowMs`. */
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const store = (globalThis.__serikaWishlistRate ??= new Map<string, number[]>());
  const now = Date.now();
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    store.set(key, hits);
    return true;
  }
  hits.push(now);
  store.set(key, hits);
  if (store.size > 20_000) store.clear();
  return false;
}
