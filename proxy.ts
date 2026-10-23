import { NextResponse, type NextRequest } from 'next/server';

/**
 * The share host (wish.ado.wtf) only serves what a shared link needs: list
 * and profile pages, the API they call, and static files. Anything else is
 * sent to the main site, where sign-in cookies live.
 */
const SHARE_HOST = hostOf(process.env.SHARE_URL);
const MAIN_URL = (process.env.BASE_URL || 'https://wish.serika.dev').replace(/\/$/, '');

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  if (!SHARE_HOST || SHARE_HOST === hostOf(MAIN_URL)) return NextResponse.next();
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host !== SHARE_HOST) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (/^\/(w|u)\/[^/]+\/?$/.test(pathname) || pathname.startsWith('/api/')) return NextResponse.next();
  return NextResponse.redirect(`${MAIN_URL}${pathname}${search}`, 308);
}

export const config = {
  matcher: ['/((?!_next/|icon\\.svg|wishlist-logo\\.svg|favicon\\.ico).*)'],
};
