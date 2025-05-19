
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Middleware is simplified to allow all requests as authentication is removed.
export async function middleware(request: NextRequest) {
  console.log(`[Middleware] Pathname: ${request.nextUrl.pathname} (Authentication Disabled)`);
  return NextResponse.next();
}

export const config = {
  // The matcher can be kept to log admin route access, or removed if no middleware action is needed.
  // For now, let's keep it minimal to avoid any unintended blocking.
  // Or, if we want no middleware for admin, we can remove the matcher or make it non-matching for /admin.
  // To effectively disable it for admin routes while keeping file for future:
  matcher: [
    /*
     * Match no admin paths to effectively disable middleware for admin routes.
     * Or remove the matcher array entirely if middleware should not run at all.
     * For this request, we remove admin path matching.
     */
     '/((?!admin|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|images|assets).*)',
  ],
};
