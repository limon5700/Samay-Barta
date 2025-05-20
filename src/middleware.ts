
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; 
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';

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
    
    const cookieStore = cookies(); // Use synchronous cookies() from next/headers
    const allCookiesForDebug = request.cookies.getAll(); 
    console.log(`[Middleware] All cookies received by middleware for path ${pathname}:`, JSON.stringify(allCookiesForDebug));

    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    const sessionCookieValue = sessionCookie?.value;
    console.log(`[Middleware] Value of '${SESSION_COOKIE_NAME}' from cookieStore.get(): '${sessionCookieValue}'`);

    // Critical: Check if the server is even configured for SuperAdmin login.
    // This check is vital because if ADMIN_USERNAME isn't set, any "superadmin_env_session" cookie is meaningless.
    const serverAdminUsername = process.env.ADMIN_USERNAME;
    if (!serverAdminUsername) {
        console.warn("[Middleware] CRITICAL SERVER MISCONFIGURATION: ADMIN_USERNAME is NOT SET on the server. SuperAdmin session cannot be validated. Redirecting to login with error.");
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('configError', encodeURIComponent('SuperAdmin login is misconfigured on the server (ADMIN_USERNAME not set). Authentication is effectively disabled.'));
        return NextResponse.redirect(loginUrl);
    }

    // Check if the cookie has the specific value for a SuperAdmin session
    // and that the server is configured for such an admin.
    if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
        // The cookie has the correct value for a SuperAdmin session.
        // The serverAdminUsername check above ensures the server is minimally configured.
        console.log(`[Middleware] Valid '${SUPERADMIN_COOKIE_VALUE}' cookie found. ADMIN_USERNAME is set on server ('${serverAdminUsername}'). Allowing access to ${pathname}.`);
        return NextResponse.next();
    }
    
    // If no valid session cookie matching SUPERADMIN_COOKIE_VALUE, redirect to login
    console.log(`[Middleware] Session cookie for SuperAdmin either not found or value ('${sessionCookieValue}') does not match '${SUPERADMIN_COOKIE_VALUE}'. Redirecting to login for path: ${pathname}.`);
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); 
    if (sessionCookieValue && sessionCookieValue !== SUPERADMIN_COOKIE_VALUE) { 
        // If a cookie exists but is not the superadmin one (e.g., old or malformed)
        loginUrl.searchParams.set('error', encodeURIComponent('Your session is invalid. Please log in again.'));
    } else if (!sessionCookieValue) {
        // If no session cookie at all
        // loginUrl.searchParams.set('error', encodeURIComponent('Your session has expired or is missing. Please log in.'));
        // No error query param here, as it's the default state for an unauthenticated user trying to access a protected route.
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
