
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Pathname: ${pathname}`);

  if (pathname === '/admin/login') {
    console.log("[Middleware] Path is /admin/login, allowing request to proceed for login page rendering.");
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const allCookies = request.cookies.getAll();
    console.log(`[Middleware] Checking auth for ${pathname}. All cookies received:`, JSON.stringify(allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))); // Log truncated values for brevity
    
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie || !sessionCookie.value || sessionCookie.value === 'undefined') {
      console.log(`[Middleware] Session cookie (${SESSION_COOKIE_NAME}) NOT FOUND or value is problematic ('${sessionCookie?.value}') for path ${pathname}. Redirecting to login.`);
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log(`[Middleware] Session cookie (${SESSION_COOKIE_NAME}) FOUND with value '${sessionCookie.value}' for path ${pathname}. Allowing request.`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};

    