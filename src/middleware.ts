
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers'; // Import cookies
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';
// getSession is not used here anymore to keep middleware Edge-compatible

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Middleware] Pathname: ${pathname}`);

  // Allow requests to the login page itself and API routes/static assets
  if (pathname.startsWith('/admin/login') || 
      pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.includes('.')) { // commonly for static files
    console.log("[Middleware] Allowing request to login, API, or static asset.");
    return NextResponse.next();
  }

  // Protect all other /admin/* routes
  if (pathname.startsWith('/admin')) {
    console.log("[Middleware] Checking session for protected admin route:", pathname);
    const cookieStore = await nextCookies(); // Use await as per TS requirement in this env
    const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
    
    console.log(`[Middleware] All cookies received:`, JSON.stringify(request.cookies.getAll()));
    console.log(`[Middleware] Session cookie (${SESSION_COOKIE_NAME}) value: ${sessionCookie?.value}`);

    // For the SuperAdmin, we only check for the specific cookie value.
    // For regular users, getSession would do more complex validation.
    // In this simplified setup, if the cookie is the superadmin one, we trust it.
    if (sessionCookie?.value === SUPERADMIN_COOKIE_VALUE) {
      // Basic check: ensure ADMIN_USERNAME is set on server, otherwise superadmin concept is broken
      if (process.env.ADMIN_USERNAME) {
          console.log("[Middleware] SuperAdmin session cookie found and ADMIN_USERNAME is set. Allowing access.");
          return NextResponse.next();
      } else {
          console.warn("[Middleware] SuperAdmin session cookie found, BUT ADMIN_USERNAME IS NOT SET ON SERVER. This is a server misconfiguration. Redirecting to login with error.");
          const loginUrl = new URL('/admin/login', request.url);
          loginUrl.searchParams.set('configError', encodeURIComponent('SuperAdmin login is misconfigured on the server (ADMIN_USERNAME not set).'));
          return NextResponse.redirect(loginUrl);
      }
    }

    // If no valid session cookie, redirect to login
    console.log("[Middleware] No valid session cookie found. Redirecting to login.");
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: tell login page where user was going
    return NextResponse.redirect(loginUrl);
  }

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
