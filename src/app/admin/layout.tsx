
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, Users, BarChart3, LogOut } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing...");

  const headers = await nextHeaders(); // Use await as TypeScript expects it
  const xInvokePath = headers.get('x-invoke-path');
  const nextUrlPath = headers.get('next-url');

  console.log(`AdminLayout: Raw x-invoke-path header: '${xInvokePath}'`);
  console.log(`AdminLayout: Raw next-url header: '${nextUrlPath}'`);

  let actualPathname = '';
  let headersAvailable = false;

  if (xInvokePath && xInvokePath !== 'null') {
    actualPathname = xInvokePath;
    headersAvailable = true;
  } else if (nextUrlPath && nextUrlPath !== 'null') {
    try {
      const url = new URL(nextUrlPath, 'http://localhost'); // Base URL is arbitrary for parsing
      actualPathname = url.pathname;
      headersAvailable = true;
    } catch (e) {
      console.warn("AdminLayout: Error parsing next-url header:", e);
      // actualPathname remains empty, headersAvailable remains false
    }
  }

  if (!headersAvailable) {
      console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Defaulting actualPathname to '/admin/login' to prevent issues.");
      actualPathname = '/admin/login'; // Safe default for path detection logic
  }
  
  console.log(`AdminLayout: Final determined pathname for showAdminNav logic: ${actualPathname}`);

  const showAdminNav = actualPathname !== '/admin/login';
  let isAuthenticated = false;
  let sessionUsername: string | null = null;

  if (showAdminNav) { // Only attempt to get session if not on login page
    console.log("AdminLayout: Path is NOT /admin/login. Attempting to fetch session.");
    try {
        const session = await getSession();
        if (session?.isAuthenticated) {
            isAuthenticated = true;
            sessionUsername = session.username;
        }
        console.log("AdminLayout: Session object received:", session);
    } catch (error) {
        console.error("AdminLayout: Error fetching session:", error);
    }
  } else {
     console.log("AdminLayout: Current path IS /admin/login. SKIPPING getSession() call for this layout render pass.");
  }


  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href={isAuthenticated ? "/admin/dashboard" : "/admin/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
          Samay Barta Lite - Admin
        </Link>
        {isAuthenticated && showAdminNav && (
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
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/users" prefetch={false}>
                <Users className="h-4 w-4 mr-2" />
                User & Role Mgmt
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/seo" prefetch={false}>
                <BarChart3 className="h-4 w-4 mr-2" />
                SEO Management
              </Link>
            </Button>
            
            <form action={logoutAction}>
              <Button variant="destructive" size="sm" type="submit" className="gap-1.5">
                <LogOut className="h-4 w-4" />
                Logout ({sessionUsername || 'Admin'})
              </Button>
            </form>
          </nav>
        )}
         {!isAuthenticated && showAdminNav && ( // User is on an admin page but not authenticated (middleware should catch this)
            <nav className="ml-auto">
                 <p className="text-sm text-muted-foreground">Not authenticated.</p>
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
