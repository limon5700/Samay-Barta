
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers'; 
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, BarChart3, Settings, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/admin/auth/actions';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing...");

  let actualPathname = '';
  let showAdminNav = true; 
  let headersAvailable = false;

  try {
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
        actualPathname = '/admin/dashboard'; // Sensible default if parsing fails and headers were attempted
      }
    }

    if (!headersAvailable) {
      console.log("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Defaulting actualPathname to '/admin/dashboard' (assuming not on login page).");
      actualPathname = '/admin/dashboard'; // If headers are missing, assume we are in an admin page
    }
  } catch (error: any) {
    console.error("AdminLayout: Error accessing headers. Defaulting to showing admin nav, assuming not on login page.", error);
    actualPathname = '/admin/dashboard'; 
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
            
            {/* User & Role Management link is removed as per your request to remove user role system */}
            {/* 
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users" prefetch={false}>
                <Users className="h-4 w-4 mr-2" />
                User & Role Mgmt
              </Link>
            </Button>
            */}

            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/seo" prefetch={false}>
                <BarChart3 className="h-4 w-4 mr-2" />
                SEO Management
              </Link>
            </Button>
            
            <form action={logoutAction}>
              <Button type="submit" variant="destructive" size="sm">
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
