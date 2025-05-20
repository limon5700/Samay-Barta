
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const allCookies = request.cookies.getAll(); // Get all cookies for logging

  // Log details for every request to /admin/*
  if (pathname.startsWith('/admin')) {
    console.log(`[Middleware] Pathname: ${pathname}`);
    console.log(`[Middleware] ALL cookies received by middleware: ${JSON.stringify(allCookies)}`);
  }

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
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const sessionCookieValue = sessionCookie?.value;
    const serverAdminUsername = process.env.ADMIN_USERNAME; // For SUPERADMIN_COOKIE_VALUE check

    console.log(`[Middleware] Checking session for protected admin route: ${pathname}`);
    console.log(`[Middleware] Value of '${SESSION_COOKIE_NAME}' from request.cookies.get(): '${sessionCookieValue}'`);
    console.log(`[Middleware] Value of process.env.ADMIN_USERNAME at middleware runtime: '${serverAdminUsername}'`);
    console.log(`[Middleware] Expected SUPERADMIN_COOKIE_VALUE: '${SUPERADMIN_COOKIE_VALUE}'`);


    // Check for SuperAdmin session specifically
    if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
      if (!serverAdminUsername) {
        console.warn("[Middleware] CRITICAL SERVER MISCONFIGURATION: SUPERADMIN_COOKIE_VALUE found, but ADMIN_USERNAME is NOT SET on server. Redirecting to login with error.");
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('configError', encodeURIComponent('SuperAdmin session validation failed (server admin username not set). Please contact support.'));
        return NextResponse.redirect(loginUrl);
      }
      // If cookie matches SUPERADMIN_COOKIE_VALUE and serverAdminUsername is set, allow access.
      console.log(`[Middleware] Valid '${SUPERADMIN_COOKIE_VALUE}' cookie found and server ADMIN_USERNAME is set ('${serverAdminUsername}'). Allowing access to ${pathname}.`);
      return NextResponse.next();
    }
    
    // Basic check for other user sessions (e.g., database users if you implement them)
    // For now, only SUPERADMIN_COOKIE_VALUE grants access through middleware.
    // If you add database users, you might check if sessionCookieValue starts with 'user_session:'
    // but full validation of those sessions would typically happen on the page/layout via getSession().
    // For simplicity here, if it's not the SUPERADMIN_COOKIE_VALUE, we redirect.

    // If no valid SUPERADMIN_COOKIE_VALUE session, redirect to login
    let reason = "Reason: Not determined.";
    if (!sessionCookieValue) {
      reason = `Reason: Session cookie '${SESSION_COOKIE_NAME}' not found.`;
    } else if (sessionCookieValue !== SUPERADMIN_COOKIE_VALUE) {
      reason = `Reason: Session cookie value '${sessionCookieValue}' is not the expected SUPERADMIN_COOKIE_VALUE ('${SUPERADMIN_COOKIE_VALUE}').`;
    }
    // The case where serverAdminUsername is missing but cookie IS SUPERADMIN_COOKIE_VALUE is handled above.
    
    console.log(`[Middleware] Session check FAILED for SUPERADMIN. ${reason} Redirecting to login for path: ${pathname}.`);
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    if (sessionCookieValue && sessionCookieValue !== SUPERADMIN_COOKIE_VALUE) {
        loginUrl.searchParams.set('error', encodeURIComponent('Invalid session type. Please log in again.'));
    } else if (!sessionCookieValue) {
         loginUrl.searchParams.set('error', encodeURIComponent('Session not found. Please log in.'));
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
