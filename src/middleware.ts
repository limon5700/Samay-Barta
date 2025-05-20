
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';
// getSession can't be used here if it relies on Node.js APIs and middleware runs on Edge.
// Middleware will do a simpler cookie check.

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Middleware] Pathname: ${pathname}`);

  // Allow requests to the login page itself, API routes, and static assets
  if (pathname.startsWith('/admin/login') || 
      pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.includes('.')) { // commonly for static files like .ico, .png
    console.log(`[Middleware] Allowing request to login, API, or static asset: ${pathname}`);
    return NextResponse.next();
  }

  // Protect all other /admin/* routes
  if (pathname.startsWith('/admin')) {
    console.log(`[Middleware] Checking session for protected admin route: ${pathname}`);
    
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const sessionCookieValue = sessionCookie?.value;
    const allCookiesForDebug = request.cookies.getAll(); 
    console.log(`[Middleware] All cookies received by middleware for path ${pathname}:`, JSON.stringify(allCookiesForDebug));
    console.log(`[Middleware] Value of '${SESSION_COOKIE_NAME}' from request.cookies.get(): '${sessionCookieValue}'`);

    // Critical: Check if the server is even configured for SuperAdmin login via .env.
    // This check uses process.env, which is available in Edge runtime if env vars are set correctly.
    const serverAdminUsername = process.env.ADMIN_USERNAME;
    if (!serverAdminUsername) {
        console.warn("[Middleware] CRITICAL SERVER MISCONFIGURATION: ADMIN_USERNAME is NOT SET on the server. SuperAdmin session cannot be validated. Redirecting to login with error.");
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('configError', encodeURIComponent('SuperAdmin login is misconfigured on the server (ADMIN_USERNAME not set). Authentication is effectively disabled.'));
        return NextResponse.redirect(loginUrl);
    }

    // Check for SuperAdmin session
    if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
        console.log(`[Middleware] Valid '${SUPERADMIN_COOKIE_VALUE}' cookie found. ADMIN_USERNAME is set on server ('${serverAdminUsername}'). Allowing access to ${pathname}.`);
        return NextResponse.next();
    }
    
    // Check for database user session (basic check, full validation by getSession on page/layout)
    if (sessionCookieValue && sessionCookieValue.startsWith('user_session:')) {
        const userId = sessionCookieValue.split(':')[1];
        if (userId) {
            console.log(`[Middleware] Database user session cookie found for user ID: ${userId}. Allowing request to proceed (further validation by page/layout if needed).`);
            // For a truly secure setup where middleware fully validates DB users,
            // getSession would need to be callable from Edge, or an API route would be used for validation.
            // For now, presence of `user_session:` cookie is deemed sufficient for middleware pass.
            return NextResponse.next();
        }
    }
    
    // If no valid session cookie, redirect to login
    console.log(`[Middleware] Session cookie for SuperAdmin or DB user not found or value invalid. Redirecting to login for path: ${pathname}. Cookie value was: '${sessionCookieValue}'`);
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); 
    if (sessionCookieValue) { 
        loginUrl.searchParams.set('error', encodeURIComponent('Your session is invalid or has expired. Please log in again.'));
    }
    return NextResponse.redirect(loginUrl);
  }

  // For all other non-admin routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for some specific Next.js internals and static files.
     * This ensures middleware runs for all page navigations.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};
