/**
 * SerikaWishlist configuration.
 *
 * Every value is environment-driven so the same image runs locally and on
 * Coolify. Identity is never self-hosted here: accounts.serika.dev owns it,
 * and guests are identified by an email address they prove with a magic link.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    // Thrown lazily at first use so `next build` works without a runtime env.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DAY_S = 24 * 60 * 60;

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  /** Public origin, used in emails, the bookmarklet and share links. */
  BASE_URL: (process.env.BASE_URL || 'https://wish.serika.dev').replace(/\/$/, ''),

  /** Short host for share links (wish.ado.wtf/w/<slug>). Serves only list and profile pages. */
  SHARE_URL: (process.env.SHARE_URL || process.env.BASE_URL || 'https://wish.ado.wtf').replace(/\/$/, ''),

  get DATABASE_URL(): string {
    return required('DATABASE_URL', process.env.DATABASE_URL || process.env.POSTGRES_URL);
  },

  ACCOUNTS_URL: (process.env.ACCOUNTS_URL || 'https://accounts.serika.dev').replace(/\/$/, ''),
  get ACCOUNTS_SERVICE_KEY(): string {
    return required(
      'AUTH_INTERNAL_KEY',
      process.env.AUTH_INTERNAL_KEY || process.env.AUTH_SERVICE_INTERNAL_KEY
    );
  },

  /** Signs nothing secret by itself, but salts token hashes. Falls back to the service key. */
  get APP_SECRET(): string {
    return (
      process.env.APP_SECRET ||
      process.env.AUTH_INTERNAL_KEY ||
      process.env.AUTH_SERVICE_INTERNAL_KEY ||
      'dev-only-secret'
    );
  },

  SESSION_COOKIE: 'serika_wishlist_session',
  REFRESH_COOKIE: 'serika_wishlist_refresh',
  GUEST_COOKIE: 'serika_wishlist_guest',
  GIFTER_COOKIE: 'serika_wishlist_gifter',

  /** Every session, Serika account or guest, lasts 30 days. */
  SESSION_TTL_S: 30 * DAY_S,
  /** Magic links work once, within this window. */
  MAGIC_LINK_TTL_S: 24 * 60 * 60,

  EMAIL: {
    REGION: process.env.AWS_REGION || 'us-east-1',
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
    FROM:
      process.env.EMAIL_FROM ||
      `Serika Wishlist <wishlist@${process.env.AWS_EMAIL_DOMAIN || 'serika.email'}>`,
  },

  LIMITS: {
    TITLE_MAX: 200,
    LIST_TITLE_MAX: 80,
    DESCRIPTION_MAX: 1000,
    NOTE_MAX: 1000,
    URL_MAX: 2048,
    ITEMS_PER_LIST: 1000,
    LISTS_PER_OWNER: 100,
    IMPORT_MAX_ITEMS: 500,
    MAGIC_LINKS_PER_EMAIL_PER_HOUR: 5,
  },
} as const;

export const isProduction = () => config.NODE_ENV === 'production';
