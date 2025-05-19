
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers'; // Keep for path detection
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, BarChart3, LogOut } from 'lucide-react'; // Users icon removed
import { logoutAction } from '@/app/admin/auth/actions'; // Import logoutAction

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing (Simplified Auth)...");

  let actualPathname = '';
  let showAdminNav = true;
  let headersAvailable = false;

  try {
    const headersList = await nextHeaders(); // Using await as TypeScript might require it
    const xInvokePath = headersList.get('x-invoke-path');
    const nextUrlPath = headersList.get('next-url');

    console.log(`AdminLayout: Raw x-invoke-path header: '${xInvokePath}'`);
    console.log(`AdminLayout: Raw next-url header: '${nextUrlPath}'`);

    if (xInvokePath && xInvokePath !== 'null' && xInvokePath.trim() !== '') {
      actualPathname = xInvokePath.trim();
      headersAvailable = true;
    } else if (nextUrlPath && nextUrlPath !== 'null' && nextUrlPath.trim() !== '') {
      try {
        // Ensure a base is provided if nextUrlPath is relative
        const base = nextUrlPath.startsWith('/') ? 'http://localhost' : undefined;
        const url = new URL(nextUrlPath, base);
        actualPathname = url.pathname.trim();
        headersAvailable = true;
      } catch (e) {
        console.warn("AdminLayout: Error parsing next-url header. Pathname determination might be affected.", e);
        // actualPathname remains empty, headersAvailable remains false
      }
    }

    if (!headersAvailable) {
      console.log("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Assuming not on login page for nav display.");
      // Default to showing nav if headers are unreliable, middleware will protect.
      // If the middleware redirects to login, this layout will re-render for /admin/login.
      actualPathname = '/admin/dashboard'; // Or some other non-login admin path
    }

  } catch (error) {
    console.error("AdminLayout: Error accessing headers. Defaulting to showing admin nav.", error);
    // If headers() fails, default to a state that shows nav, middleware is the guard.
    actualPathname = '/admin/dashboard'; // Or some other non-login admin path
  }

  console.log(`AdminLayout: Final determined pathname for showAdminNav logic: ${actualPathname}`);

  if (actualPathname === '/admin/login') {
    showAdminNav = false;
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href="/admin/dashboard" className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
          Samay Barta Lite - Admin
        </Link>
        {showAdminNav && (
          <nav className="ml-auto flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" prefetch={false}>
                <Home className="h-4 w-4 mr-2" />
                View Site
              </Link>
            </Button>
            
            <Button variant="default" size="sm" asChild>
              <Link href="/admin/dashboard" prefetch={false}>
                <Newspaper className="h-4 w-4 mr-2" />
                Manage Articles
              </Link>
            </Button>

            <Button variant="secondary" size="sm" asChild>
              <Link href="/admin/layout-editor" prefetch={false}>
                <LayoutIcon className="h-4 w-4 mr-2" />
                Layout Editor
              </Link>
            </Button>
            
            {/* User & Role Management link is removed as per previous steps */}

            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/seo" prefetch={false}>
                <BarChart3 className="h-4 w-4 mr-2" />
                SEO Management
              </Link>
            </Button>
            
            <form action={logoutAction}>
              <Button variant="destructive" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </form>
          </nav>
        )}
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">{children}</main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} Samay Barta Lite Admin Panel
      </footer>
    </div>
  );
}
