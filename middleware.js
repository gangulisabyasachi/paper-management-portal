import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptPortalSession } from './lib/portal/session';
import { isRobot } from './lib/botDetection';

const PORTAL_PUBLIC_PAGES = ['/portal/login', '/portal/signup'];
const PORTAL_PUBLIC_API_PREFIXES = ['/api/portal/auth'];
const PORTAL_ROLE_HOME = {
  submitter: '/portal/dashboard',
  reviewer: '/portal/reviewer',
  editor: '/portal/editor',
  admin: '/portal/admin',
};

export default async function middleware(req) {
  const path = req.nextUrl.pathname;

  const userAgent = req.headers.get('user-agent') || '';
  if (isRobot(userAgent)) {
    return new NextResponse(
      JSON.stringify({ error: 'Automated access blocked.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const isApi = path.startsWith('/api/');
  const isPortalPage = path.startsWith('/portal');

  const cookieStore = await cookies();
  const portalCookie = cookieStore.get('portal_session')?.value;
  const portalSession = portalCookie
    ? await decryptPortalSession(portalCookie)
    : null;

  if (isApi) {
    const isPublicApi = PORTAL_PUBLIC_API_PREFIXES.some((prefix) =>
      path.startsWith(prefix)
    );
    if (!isPublicApi && !portalSession?.userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Portal authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else if (isPortalPage) {
    const isPublicPage = PORTAL_PUBLIC_PAGES.includes(path);
    if (!isPublicPage && !portalSession?.userId) {
      return NextResponse.redirect(new URL('/portal/login', req.nextUrl));
    }
    if (isPublicPage && portalSession?.userId) {
      const dest = PORTAL_ROLE_HOME[portalSession.role] || '/portal/dashboard';
      return NextResponse.redirect(new URL(dest, req.nextUrl));
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/data|_next/image|favicon.ico|sitemap.xml|robots.txt|images|[\\w-]+\\.\\w+).*)',
  ],
};
