
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers'; // Corrected import
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, Users, BarChart3, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/admin/auth/actions'; // getSession is not called here

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing...");

  let actualPathname = '';
  let headersAvailable = false;
  let sessionUsername: string | null = null; // To display in logout button if available

  try {
    const headersList = await nextHeaders(); // Use await as TypeScript expects it
    const xInvokePath = headersList.get('x-invoke-path');
    const nextUrlPath = headersList.get('next-url');

    console.log(`AdminLayout: Raw x-invoke-path header: '${xInvokePath}'`);
    console.log(`AdminLayout: Raw next-url header: '${nextUrlPath}'`);

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
      }
    }

    if (!headersAvailable) {
        console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Defaulting actualPathname to '/admin/login' to prevent issues.");
        actualPathname = '/admin/login'; 
    }
  } catch (error) {
      console.error("AdminLayout: Error accessing headers. Defaulting actualPathname to '/admin/login'. Error:", error);
      actualPathname = '/admin/login';
  }
  
  console.log(`AdminLayout: Final determined pathname for showAdminNav logic: ${actualPathname}`);

  const showAdminNav = actualPathname !== '/admin/login';
  
  // We are not calling getSession() here to determine sessionUsername or isAuthenticated for link display.
  // The middleware handles route protection. If the user is on an admin page (not login),
  // they are assumed to be authenticated by the middleware.
  // For displaying username in logout, we can try a lightweight session check if truly needed,
  // but for now, we'll keep it simple to avoid reintroducing session check complexity in the layout.
  // A more advanced approach might involve a client-side fetch for user info if really needed in the header.

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href={showAdminNav ? "/admin/dashboard" : "/admin/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
          Samay Barta Lite - Admin
        </Link>
        {showAdminNav && ( // Only show nav links if not on the login page
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
                Logout {/* Username display removed for simplicity to avoid getSession call here */}
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
