
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/app/admin/auth/actions'; // Import cookie name

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is for an admin route (excluding /admin/login itself)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    // If there's no session cookie, redirect to the login page
    if (!sessionCookie) {
      const loginUrl = new URL('/admin/login', request.url);
      // If trying to access dashboard or other admin page directly, add a redirect query param
      if (pathname !== '/admin/login') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    
    // Add further token validation here if needed
    // For example, decode and verify a JWT.
    // If token is invalid, clear it and redirect.
    // const isValidToken = await verifyToken(sessionCookie.value); // Placeholder
    // if (!isValidToken) {
    //   const response = NextResponse.redirect(new URL('/admin/login', request.url));
    //   response.cookies.delete(SESSION_COOKIE_NAME);
    //   return response;
    // }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public files in the public folder
     */
    '/admin/:path*', // Protects all routes under /admin
    // Ensure other paths are not unintentionally matched if you add more general matchers
  ],
};
