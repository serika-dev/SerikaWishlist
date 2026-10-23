import { accountsGetUser, graphFriendRemove, graphFriendRequest, graphFriends } from './accounts';
import { query } from './db';
import type { PublicUser } from './owners';

/**
 * Friends come from serika-accounts' interchange graph, the same one
 * SerikaCord, Social and serika.dev use, so a friend made anywhere in Serika
 * is a friend here and the other way round. We only cache it briefly.
 */

export type FriendState = 'none' | 'friends' | 'outgoing' | 'incoming' | 'self';

interface Graph {
  friends: string[];
  incoming: string[];
  outgoing: string[];
}

const GRAPH_TTL_MS = 30_000;

declare global {
  // eslint-disable-next-line no-var
  var __serikaWishlistGraph: Map<string, { graph: Graph; expires: number }> | undefined;
}

function graphCache() {
  return (globalThis.__serikaWishlistGraph ??= new Map());
}

export async function getGraph(accountsId: string): Promise<Graph> {
  const hit = graphCache().get(accountsId);
  if (hit && hit.expires > Date.now()) return hit.graph;
  const result = await graphFriends(accountsId);
  if (!result.ok) {
    // Accounts unreachable: keep the last answer rather than dropping everyone's friends.
    return hit?.graph ?? { friends: [], incoming: [], outgoing: [] };
  }
  const graph = {
    friends: result.data.friends ?? [],
    incoming: result.data.incoming ?? [],
    outgoing: result.data.outgoing ?? [],
  };
  const cache = graphCache();
  if (cache.size > 2000) cache.clear();
  cache.set(accountsId, { graph, expires: Date.now() + GRAPH_TTL_MS });
  return graph;
}

function forget(...ids: string[]) {
  for (const id of ids) graphCache().delete(id);
}

export async function friendState(viewerId: string | null | undefined, otherId: string): Promise<FriendState> {
  if (!viewerId) return 'none';
  if (viewerId === otherId) return 'self';
  const graph = await getGraph(viewerId);
  if (graph.friends.includes(otherId)) return 'friends';
  if (graph.outgoing.includes(otherId)) return 'outgoing';
  if (graph.incoming.includes(otherId)) return 'incoming';
  return 'none';
}

export async function areFriends(a: string | null | undefined, b: string | null | undefined): Promise<boolean> {
  if (!a || !b || a === b) return false;
  return (await friendState(a, b)) === 'friends';
}

export async function friendIds(viewerId: string): Promise<string[]> {
  return (await getGraph(viewerId)).friends;
}

/** Send a request, or accept theirs if they already asked. */
export async function requestFriend(viewerId: string, otherId: string): Promise<FriendState> {
  const state = await friendState(viewerId, otherId);
  if (state === 'self' || state === 'friends' || state === 'outgoing') return state;
  const result = await graphFriendRequest(viewerId, otherId, viewerId);
  forget(viewerId, otherId);
  if (!result.ok || result.data.error) throw new Error('Serika accounts could not send that request. Try again.');
  return result.data.status === 'pending' ? 'outgoing' : 'friends';
}

export async function acceptFriend(viewerId: string, requesterId: string): Promise<FriendState> {
  if ((await friendState(viewerId, requesterId)) !== 'incoming') return friendState(viewerId, requesterId);
  const result = await graphFriendRequest(viewerId, requesterId, requesterId, 1);
  forget(viewerId, requesterId);
  if (!result.ok) throw new Error('Serika accounts could not accept that request. Try again.');
  return 'friends';
}

/** Decline, cancel or unfriend. This is the same friendship everywhere in Serika. */
export async function removeFriend(viewerId: string, otherId: string): Promise<void> {
  const result = await graphFriendRemove(viewerId, otherId);
  forget(viewerId, otherId);
  if (!result.ok) throw new Error('Serika accounts could not update that friendship. Try again.');
}

/**
 * Profiles for account ids. Users who have used Serika Wishlist are in our
 * mirror; the rest are looked up once and mirrored (name and avatar only,
 * never their email).
 */
export async function resolveUsers(ids: string[]): Promise<PublicUser[]> {
  if (ids.length === 0) return [];
  const rows = await query<{ id: string; username: string; display_name: string | null; avatar: string | null }>(
    `SELECT id, username, display_name, avatar FROM users WHERE id = ANY($1)`,
    [ids]
  );
  const known = new Map(rows.map((r) => [r.id, { id: r.id, username: r.username, displayName: r.display_name, avatar: r.avatar }]));
  const missing = ids.filter((id) => !known.has(id)).slice(0, 50);
  await Promise.all(
    missing.map(async (id) => {
      const result = await accountsGetUser(id);
      const u = result.ok ? result.data.user : undefined;
      if (!u?.username) return;
      const profile = { id, username: u.username, displayName: u.displayName || null, avatar: u.avatar || null };
      known.set(id, profile);
      await query(
        `INSERT INTO users (id, username, display_name, avatar) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name, avatar = EXCLUDED.avatar`,
        [id, profile.username, profile.displayName, profile.avatar]
      ).catch(() => {});
    })
  );
  return ids.map((id) => known.get(id)).filter((u): u is PublicUser => Boolean(u));
}

export async function friendOverview(viewerId: string) {
  const graph = await getGraph(viewerId);
  const [friends, incoming, outgoing] = await Promise.all([
    resolveUsers(graph.friends),
    resolveUsers(graph.incoming),
    resolveUsers(graph.outgoing),
  ]);
  const byName = (a: PublicUser, b: PublicUser) =>
    (a.displayName || a.username).localeCompare(b.displayName || b.username, undefined, { sensitivity: 'base' });
  return { friends: friends.sort(byName), incoming, outgoing };
}
