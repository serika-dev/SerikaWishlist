import { sanitizeDraft } from '../lists';
import { safeFetch } from '../safe-fetch';
import type { ItemDraft } from '../types';
import { ImportError, NeedsBrowserImportError, type ImportedList } from './types';

/**
 * Throne (throne.com/<username>). The website itself sits behind Vercel's bot
 * check, but the two public sources it renders from do not: the creator
 * profile API (username → creator id) and the creator's `wishlistItems`
 * collection in Throne's Firestore, which is world-readable. Items are shown
 * newest-first by `itemIndex`, hidden and saved-for-later ones are not public.
 */

const PROFILE_API = 'https://api.throne.com/api-creator/v1/profile/username/';
const FIRESTORE =
  'https://firestore.googleapis.com/v1/projects/onlywish-9d17b/databases/(default)/documents/creators/';

const RESERVED = new Set(['login', 'signup', 'blog', 'about', 'privacy', 'terms', 'how-it-works', 'security-and-privacy', 'explore', 'search', 'u', 'wishlist', 'settings', 'dashboard']);

export function throneUsername(url: URL): string | null {
  if (!/(^|\.)throne\.(com|me)$/.test(url.hostname)) return null;
  const first = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (!first || RESERVED.has(first) || !/^[a-z0-9_.-]{1,40}$/.test(first)) return null;
  return first;
}

/** Firestore REST wraps every value in its type: { stringValue: "x" }, { integerValue: "3" }... */
type FsValue = Record<string, unknown>;
function fsDecode(value: FsValue | undefined): unknown {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) return fsFields((value.mapValue as { fields?: Record<string, FsValue> }).fields);
  if ('arrayValue' in value) return ((value.arrayValue as { values?: FsValue[] }).values || []).map(fsDecode);
  return undefined;
}
function fsFields(fields: Record<string, FsValue> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = fsDecode(value);
  return out;
}

export interface ThroneItem {
  id?: string;
  name?: string;
  description?: string;
  link?: string;
  imgLink?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  isFavorite?: boolean;
  isHidden?: boolean;
  isSavedForLater?: boolean;
  itemIndex?: number;
  domainBase?: string;
}

/** Shared with the bookmarklet path, which hands us Throne's own item objects. */
export function throneItemsToDrafts(items: ThroneItem[]): ItemDraft[] {
  return items
    .filter((item) => !item.isHidden && !item.isSavedForLater)
    .sort((a, b) => (b.itemIndex ?? 0) - (a.itemIndex ?? 0))
    .map((item) =>
      sanitizeDraft({
        title: item.name || '',
        url: item.link || null,
        imageUrl: item.imgLink || null,
        // Throne stores prices in minor units.
        price: typeof item.price === 'number' ? item.price / 100 : null,
        currency: item.currency || null,
        store: item.domainBase || null,
        note: item.description || '',
        quantity: item.quantity || 1,
        priority: item.isFavorite ? 1 : 0,
        sourceRef: item.id ? `throne:${item.id}` : null,
      })
    )
    .filter((d): d is ItemDraft => d !== null);
}

async function getJson(url: string): Promise<{ status: number; data: unknown }> {
  const response = await safeFetch(url, { accept: 'application/json', headers: { Origin: 'https://throne.com' } });
  let data: unknown = null;
  try {
    data = JSON.parse(response.text);
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

export async function importThrone(url: URL): Promise<ImportedList> {
  const username = throneUsername(url);
  if (!username) throw new ImportError('That does not look like a Throne wishlist link (throne.com/username).');

  const profile = await getJson(PROFILE_API + encodeURIComponent(username));
  if (profile.status === 404) throw new ImportError(`There is no Throne creator called “${username}”.`);
  const creator = profile.data as { id?: string; displayName?: string; bio?: string } | null;
  if (profile.status !== 200 || !creator?.id) {
    throw new NeedsBrowserImportError('throne', 'Throne would not tell our server about that creator.');
  }

  const raw: ThroneItem[] = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const listUrl = `${FIRESTORE}${encodeURIComponent(creator.id)}/wishlistItems?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const result = await getJson(listUrl);
    if (result.status !== 200) {
      throw new NeedsBrowserImportError('throne', 'Throne’s item store would not answer our server.');
    }
    const body = result.data as { documents?: { fields?: Record<string, FsValue> }[]; nextPageToken?: string };
    for (const doc of body.documents || []) raw.push(fsFields(doc.fields) as ThroneItem);
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }

  const name = creator.displayName || username;
  return {
    source: 'throne',
    sourceUrl: `https://throne.com/${username}`,
    title: `${name}'s wishlist`,
    description: '',
    ownerName: name,
    related: [],
    items: throneItemsToDrafts(raw),
  };
}
