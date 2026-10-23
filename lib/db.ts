import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { config } from './config';

/**
 * Postgres access layer.
 *
 * The pool lives on globalThis so dev-mode module reloading does not leak
 * connections, and the schema is applied once per process behind a promise:
 * there is no separate migrate step, the app self-migrates on first query.
 */

declare global {
  // eslint-disable-next-line no-var
  var __serikaWishlistPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __serikaWishlistSchema: Promise<void> | undefined;
}

function createPool(): Pool {
  const ssl =
    process.env.PGSSLMODE && process.env.PGSSLMODE !== 'disable'
      ? { rejectUnauthorized: false }
      : undefined;

  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl,
    max: parseInt(process.env.PGPOOL_MAX || '10', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}

export function getPool(): Pool {
  if (!globalThis.__serikaWishlistPool) globalThis.__serikaWishlistPool = createPool();
  return globalThis.__serikaWishlistPool;
}

export type Queryable = Pick<PoolClient, 'query'>;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: Queryable
): Promise<T[]> {
  await ensureSchema();
  const result = await (client ?? getPool()).query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: Queryable
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

/** Run `fn` inside a transaction, rolling back on any throw. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL,
  display_name  TEXT,
  email         TEXT,
  avatar        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_username_idx ON users (LOWER(username));

-- A guest is whoever holds the guest cookie. "email" is only ever set once the
-- address has been proven with a magic link; until then it sits in pending_email.
CREATE TABLE IF NOT EXISTS guests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT,
  email_verified_at  TIMESTAMPTZ,
  pending_email      TEXT,
  claimed_user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  claimed_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS guests_email_uniq ON guests (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS guest_sessions (
  token_hash  TEXT PRIMARY KEY,
  guest_id    UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS guest_sessions_guest_idx ON guest_sessions (guest_id);

CREATE TABLE IF NOT EXISTS magic_links (
  token_hash  TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  guest_id    UUID REFERENCES guests(id) ON DELETE CASCADE,
  return_to   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS magic_links_email_idx ON magic_links (LOWER(email), created_at DESC);

CREATE TABLE IF NOT EXISTS wishlists (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE,
  owner_user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  owner_guest_id     UUID REFERENCES guests(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  emoji              TEXT NOT NULL DEFAULT '🎁',
  visibility         TEXT NOT NULL DEFAULT 'unlisted',
  show_reservations  BOOLEAN NOT NULL DEFAULT FALSE,
  source             TEXT,
  source_url         TEXT,
  position           INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (owner_user_id IS NOT NULL OR owner_guest_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS wishlists_user_idx ON wishlists (owner_user_id);
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_visibility_check;
ALTER TABLE wishlists ADD CONSTRAINT wishlists_visibility_check
  CHECK (visibility IN ('public', 'unlisted', 'friends', 'private'));
CREATE INDEX IF NOT EXISTS wishlists_guest_idx ON wishlists (owner_guest_id);

CREATE TABLE IF NOT EXISTS items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id  UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  url          TEXT,
  image_url    TEXT,
  price        NUMERIC(14, 2),
  currency     TEXT,
  store        TEXT,
  note         TEXT NOT NULL DEFAULT '',
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 999),
  priority     SMALLINT NOT NULL DEFAULT 0,
  position     DOUBLE PRECISION NOT NULL DEFAULT 0,
  received_at  TIMESTAMPTZ,
  source_ref   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS items_wishlist_idx ON items (wishlist_id, position);

-- Gift-givers mark an item as taken so nobody buys it twice. The owner never
-- sees these unless they turn spoilers on for the list.
CREATE TABLE IF NOT EXISTS reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  gifter_id   TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reservations_item_idx ON reservations (item_id);
CREATE INDEX IF NOT EXISTS reservations_gifter_idx ON reservations (gifter_id);

`;

export function ensureSchema(): Promise<void> {
  if (!globalThis.__serikaWishlistSchema) {
    globalThis.__serikaWishlistSchema = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((error) => {
        globalThis.__serikaWishlistSchema = undefined;
        throw error;
      });
  }
  return globalThis.__serikaWishlistSchema;
}
