import { findUser, PUBLIC_HEADERS, userWishlistsResponse } from '@/lib/public-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const username = decodeURIComponent((await params).username).replace(/^@/, '');
  return userWishlistsResponse(username.length <= 64 ? await findUser({ username }) : null, request);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: PUBLIC_HEADERS });
}
