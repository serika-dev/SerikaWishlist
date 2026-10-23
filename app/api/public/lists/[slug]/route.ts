import { getListBySlug } from '@/lib/lists';
import { findUser, itemLimit, PUBLIC_HEADERS, publicJson, serializeList, serializeUser } from '@/lib/public-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One list by its slug: public and link-only lists (having the link is the permission). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const list = await getListBySlug((await params).slug);
  if (!list || (list.visibility !== 'public' && list.visibility !== 'unlisted')) {
    return publicJson({ error: 'That wishlist does not exist or is not shared.' }, 404);
  }
  const owner = list.ownerUserId ? await findUser({ id: list.ownerUserId }) : null;
  return publicJson({ list: await serializeList(list, itemLimit(request, 12)), user: owner ? serializeUser(owner) : null });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: PUBLIC_HEADERS });
}
