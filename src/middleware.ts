
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const allCookies = request.cookies.getAll();

  // Log details for every request to /admin/*
  if (pathname.startsWith('/admin')) {
    console.log(`[Middleware] Pathname: ${pathname}`);
    console.log(`[Middleware] ALL cookies received by middleware: ${JSON.stringify(allCookies)}`);
  }

  // Allow requests to the login page itself, API routes, and static assets
  if (
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // commonly for static files like .ico, .png
  ) {
    console.log(`[Middleware] Allowing request to login, API, or static asset: ${pathname}`);
    return NextResponse.next();
  }

  // Protect all other /admin/* routes
  if (pathname.startsWith('/admin')) {
    const sessionCookie = await request.cookies.get(SESSION_COOKIE_NAME);
    const sessionCookieValue = sessionCookie?.value;
    const serverAdminUsername = process.env.ADMIN_USERNAME;

    console.log(`[Middleware] Checking session for protected admin route: ${pathname}`);
    console.log(`[Middleware] Value of '${SESSION_COOKIE_NAME}' from request.cookies.get(): '${sessionCookieValue}'`);
    console.log(`[Middleware] Expected SUPERADMIN_COOKIE_VALUE: '${SUPERADMIN_COOKIE_VALUE}'`);
    console.log(`[Middleware] Value of process.env.ADMIN_USERNAME at middleware runtime: '${serverAdminUsername}'`);

    let reasonForRedirect = '';

    if (!sessionCookieValue) {
      reasonForRedirect = `Session cookie '${SESSION_COOKIE_NAME}' not found.`;
    } else if (sessionCookieValue !== SUPERADMIN_COOKIE_VALUE) {
      reasonForRedirect = `Session cookie value '${sessionCookieValue}' is not the expected SUPERADMIN_COOKIE_VALUE ('${SUPERADMIN_COOKIE_VALUE}').`;
    } else if (!serverAdminUsername) {
      // This case is critical: SuperAdmin cookie is present, but server doesn't know its own admin username.
      reasonForRedirect = `CRITICAL SERVER MISCONFIGURATION: '${SUPERADMIN_COOKIE_VALUE}' found, but ADMIN_USERNAME is NOT SET on server. Session is invalid.`;
      console.error(`[Middleware] ${reasonForRedirect}`);
      // In this specific critical case, also ensure the problematic cookie is cleared if possible, though middleware can't directly call `cookies().delete()` on the response here easily.
      // The main action is to redirect.
    }

    if (reasonForRedirect) {
      console.log(`[Middleware] Session check FAILED. ${reasonForRedirect} Redirecting to login for path: ${pathname}.`);
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      if (reasonForRedirect.includes('CRITICAL SERVER MISCONFIGURATION')) {
        loginUrl.searchParams.set('configError', encodeURIComponent('SuperAdmin session validation failed due to server misconfiguration.'));
      } else {
        loginUrl.searchParams.set('error', encodeURIComponent('Session invalid or expired. Please log in again.'));
      }
      return NextResponse.redirect(loginUrl);
    }

    // If all checks pass for SUPERADMIN_COOKIE_VALUE
    console.log(`[Middleware] Valid '${SUPERADMIN_COOKIE_VALUE}' cookie found and server ADMIN_USERNAME is set. Allowing access to ${pathname}.`);
    return NextResponse.next();
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
