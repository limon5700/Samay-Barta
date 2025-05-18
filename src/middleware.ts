
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'; // No longer needed

export function middleware(request: NextRequest) {
  // Authentication checks are bypassed as per user request.
  // All requests to admin paths will be allowed through.
  console.log(`[Middleware] Bypassing auth for path: ${request.nextUrl.pathname}`);
  return NextResponse.next();
}

// The matcher is removed or commented out to disable middleware for admin routes,
// effectively making them public.
export const config = {
  // matcher: [
  //   '/admin/:path*', // Protect all admin routes
  // ],
  matcher: [], // No routes will be matched by this middleware
};
