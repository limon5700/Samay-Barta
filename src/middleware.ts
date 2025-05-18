
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/app/admin/auth/actions'; // Assuming getSession is correctly defined
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants';

const ADMIN_LOGIN_PATH = '/admin/login';
const PROTECTED_ADMIN_ROOT = '/admin';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Checking path: ${pathname}`);

  // Allow requests to the login page and API routes used by login/logout
  if (pathname === ADMIN_LOGIN_PATH || 
      pathname.startsWith('/api/auth')) { // Example public API path
    console.log(`[Middleware] Path ${pathname} is public or auth-related. Allowing.`);
    return NextResponse.next();
  }

  // Protect all other routes under /admin
  if (pathname.startsWith(PROTECTED_ADMIN_ROOT)) {
    console.log(`[Middleware] Path ${pathname} is a protected admin route. Checking session...`);
    const allCookies = request.cookies.getAll();
    console.log(`[Middleware] All cookies received on request for ${pathname}:`, allCookies.map(c => `${c.name}=${c.value.substring(0,20)}...`).join('; ') || 'NONE');

    const session = await getSession(); // getSession reads from request cookies via next/headers

    if (!session || !session.isAuthenticated) {
      console.log(`[Middleware] No valid session found for ${pathname}. Redirecting to login.`);
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set('redirect_from', pathname); // Optional: add redirect query
      return NextResponse.redirect(loginUrl);
    }
    console.log(`[Middleware] Valid session found for ${session.username} at ${pathname}. Allowing request.`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*', // Protect all admin routes
    // Ensure API routes used by public pages are not matched here if they don't need auth
    // Or explicitly allow them above.
  ],
};
