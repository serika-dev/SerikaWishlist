import { findUser, PUBLIC_HEADERS, userWishlistsResponse } from '@/lib/public-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public wishlists of a Serika account, by accounts id (what SerikaCord knows). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return userWishlistsResponse(/^[a-zA-Z0-9_-]{1,64}$/.test(id) ? await findUser({ id }) : null, request);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: PUBLIC_HEADERS });
}
