
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Middleware is now simplified as authentication is removed for admin routes.
// It will allow all requests to pass through.

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Middleware] Pathname: ${pathname} (Auth checks disabled)`);

  // No authentication checks, allow all requests.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for API routes, static files, image optimization files.
     * This ensures middleware runs for all page navigations.
     * We keep this general matcher in case other global middleware logic is added later,
     * but for now, it doesn't perform any auth-specific blocking.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};
