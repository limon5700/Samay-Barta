
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; 
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';

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
    
    const cookieStore = cookies(); // Use synchronous cookies() from next/headers
    const allCookies = request.cookies.getAll(); // Get all cookies from the NextRequest for logging
    console.log(`[Middleware] All cookies received by middleware for path ${pathname}:`, JSON.stringify(allCookies));

    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    const sessionCookieValue = sessionCookie?.value;
    console.log(`[Middleware] Value of ${SESSION_COOKIE_NAME} from cookieStore.get(): ${sessionCookieValue}`);

    if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
      // Basic check: ensure server is still configured for this superadmin
      if (process.env.ADMIN_USERNAME) {
          console.log("[Middleware] Valid 'superadmin_env_session' cookie found and ADMIN_USERNAME is set on server. Allowing access.");
          return NextResponse.next();
      } else {
          console.warn("[Middleware] 'superadmin_env_session' cookie found, but ADMIN_USERNAME IS NOT SET ON SERVER. This is a server misconfiguration. Redirecting to login with error.");
          const loginUrl = new URL('/admin/login', request.url);
          loginUrl.searchParams.set('configError', encodeURIComponent('SuperAdmin login is misconfigured on the server (ADMIN_USERNAME not set).'));
          return NextResponse.redirect(loginUrl);
      }
    }
    
    // If no valid session cookie, redirect to login
    console.log(`[Middleware] No valid session cookie ('${sessionCookieValue}') found for SUPERADMIN_COOKIE_VALUE. Redirecting to login for path: ${pathname}.`);
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); 
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
