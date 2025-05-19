
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'; // Using the new simple cookie name

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Middleware] Pathname: ${pathname}`);

  const allCookies = request.cookies.getAll();
  console.log("[Middleware] All cookies received:", allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + (c.value.length > 50 ? '...' : '') })));


  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  console.log(`[Middleware] Session cookie (${SESSION_COOKIE_NAME}) value: '${sessionCookieValue || 'NOT FOUND'}'`);

  // Allow access to login page and public assets
  if (pathname.startsWith('/admin/login') || 
      pathname.startsWith('/_next/') || 
      pathname.startsWith('/static/') || 
      pathname.includes('.') // Generally allows files with extensions (images, css, js)
     ) {
    console.log("[Middleware] Allowing request to public or login path:", pathname);
    return NextResponse.next();
  }

  // For all other admin routes, require the session cookie
  if (pathname.startsWith('/admin')) {
    if (sessionCookieValue === 'true') { // Simple check for the presence of 'true'
      console.log("[Middleware] Valid session cookie found. Allowing access to:", pathname);
      return NextResponse.next();
    } else {
      console.log("[Middleware] No valid session cookie found. Redirecting to login for path:", pathname);
      const loginUrl = new URL('/admin/login', request.url);
      // Preserve the original destination to redirect back after login
      if (pathname !== '/admin/dashboard') { // Avoid self-redirect loop from dashboard
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for API routes, static files, image optimization files.
     * This ensures middleware runs for all page navigations.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};
