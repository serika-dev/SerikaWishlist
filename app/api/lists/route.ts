import { fail, handler, ok, optionalEnum, optionalString, readJson } from '@/lib/api';
import { config } from '@/lib/config';
import { ensureGuest } from '@/lib/guest';
import { countListsForOwner, createList, listsForViewer } from '@/lib/lists';
import { VISIBILITIES } from '@/lib/types';
import { getViewer, ownerOf } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const viewer = await getViewer();
  return ok({ lists: await listsForViewer(viewer), signedIn: Boolean(viewer.user), guest: viewer.guest });
});

/** New list. Without an account this quietly starts a guest session. */
export const POST = handler(async (request: Request) => {
  const body = await readJson(request);
  const viewer = await getViewer();
  const owner = ownerOf(viewer) ?? { guestId: (await ensureGuest()).id };

  if ((await countListsForOwner(owner)) >= config.LIMITS.LISTS_PER_OWNER) {
    return fail(`You can have up to ${config.LIMITS.LISTS_PER_OWNER} wishlists.`);
  }

  const list = await createList(owner, {
    title: optionalString(body.title, 'Title', config.LIMITS.LIST_TITLE_MAX) || 'My wishlist',
    description: optionalString(body.description, 'Description', config.LIMITS.DESCRIPTION_MAX),
    emoji: typeof body.emoji === 'string' ? body.emoji : undefined,
    visibility: optionalEnum(body.visibility, VISIBILITIES, 'Visibility'),
  });
  return ok({ list }, 201);
});
