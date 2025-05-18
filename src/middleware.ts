
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants';

const ADMIN_LOGIN_PATH = '/admin/login';
const PROTECTED_ADMIN_ROOT = '/admin';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Pathname: ${pathname}`);

  const allCookies = request.cookies.getAll();
  console.log(`[Middleware] All cookies received on request for ${pathname}:`, allCookies.map(c => `${c.name}=${c.value.substring(0,30)}...`).join('; ') || 'NONE');

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  console.log(`[Middleware] Session cookie (${SESSION_COOKIE_NAME}) value: ${sessionCookieValue ? `'${sessionCookieValue.substring(0,30)}...'` : 'NOT FOUND'}`);

  // Allow requests to the login page itself
  if (pathname === ADMIN_LOGIN_PATH) {
    console.log(`[Middleware] Path ${pathname} is login page. Allowing.`);
    return NextResponse.next();
  }

  // Protect all other routes under /admin
  if (pathname.startsWith(PROTECTED_ADMIN_ROOT)) {
    console.log(`[Middleware] Path ${pathname} is a protected admin route. Checking for session cookie presence...`);
    // Check for presence and ensure it's not the literal string 'undefined'
    if (!sessionCookieValue || sessionCookieValue === 'undefined') {
      console.log(`[Middleware] Session cookie NOT FOUND or problematic for ${pathname}. Redirecting to login.`);
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      return NextResponse.redirect(loginUrl);
    }
    // For SuperAdmin mode, presence of *any* valid-looking cookie value is enough for middleware.
    // getSession on the server component or API route will do the actual validation of "superadmin_env_session" or "user:id".
    console.log(`[Middleware] Session cookie FOUND for ${pathname}. Allowing request to proceed. Full validation will occur server-side.`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - robots.txt (robots file)
     * - images/ (public images folder if you have one)
     * - assets/ (public assets folder if you have one)
     */
    '/admin/:path*((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|images|assets).*)',
  ],
};
