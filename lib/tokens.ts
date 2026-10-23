import { createHash, randomBytes } from 'node:crypto';
import { config } from './config';

/** URL-safe random token for cookies and magic links. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are stored hashed, so a database leak hands out no live sessions or links. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(`${config.APP_SECRET}:${raw}`).digest('hex');
}

const SLUG_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

/** Short public id for share links, e.g. /w/k7m2qx9p. No look-alike characters. */
export function randomSlug(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}
