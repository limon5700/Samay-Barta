
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, BarChart3 } from 'lucide-react'; // LogOut and user-related icons removed

// No getSession or logoutAction needed as auth is disabled

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing (Authentication Disabled)...");

  let actualPathname = '';
  let showAdminNav = true; // Default to true, hide only if on the login page (which now auto-redirects)
  let headersAvailable = false;

  try {
    // Attempt to read headers to determine if we are on the login page
    // (although login page will redirect, this logic prevents nav flashing)
    const headersList = await nextHeaders();
    const xInvokePath = headersList.get('x-invoke-path');
    const nextUrlPath = headersList.get('next-url');

    console.log(`AdminLayout: Raw x-invoke-path header: '${xInvokePath}'`);
    console.log(`AdminLayout: Raw next-url header: '${nextUrlPath}'`);

    if (xInvokePath && xInvokePath !== 'null' && xInvokePath.trim() !== '') {
      actualPathname = xInvokePath.trim();
      headersAvailable = true;
    } else if (nextUrlPath && nextUrlPath !== 'null' && nextUrlPath.trim() !== '') {
      try {
        const base = nextUrlPath.startsWith('/') ? 'http://localhost' : undefined;
        const url = new URL(nextUrlPath, base);
        actualPathname = url.pathname.trim();
        headersAvailable = true;
      } catch (e) {
        console.warn("AdminLayout: Error parsing next-url header. Pathname determination might be affected.", e);
      }
    }

    if (!headersAvailable) {
      console.log("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Assuming NOT on login page for nav display.");
      actualPathname = '/admin/dashboard'; // Default to a non-login admin path
    }

  } catch (error: any) {
    console.error("AdminLayout: Error accessing headers. Defaulting to showing admin nav.", error);
    // If headers() fails, default to a state that shows nav.
    actualPathname = '/admin/dashboard'; // Default to a non-login admin path
  }

  console.log(`AdminLayout: Final determined pathname for showAdminNav logic: ${actualPathname}`);

  if (actualPathname === '/admin/login') {
    // This case is mainly for the brief moment before login page redirects.
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
            
            {/* User & Role Management link is removed as user roles are disabled */}

            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/seo" prefetch={false}>
                <BarChart3 className="h-4 w-4 mr-2" />
                SEO Management
              </Link>
            </Button>
            
            {/* Logout button removed as authentication is disabled */}
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
