
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers'; 
import { Button } from '@/components/ui/button';
import { Home, Newspaper, LogOut, Layout, Users, BarChart3 } from 'lucide-react';
import { logoutAction } from '@/app/admin/auth/actions';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing...");

  let actualPathname: string | null = null;
  let headersAvailable = false;
  try {
    const headersList = await nextHeaders(); 
    const xInvokePath = headersList.get('x-invoke-path');
    const nextUrlHeader = headersList.get('next-url');

    console.log(`AdminLayout: Raw x-invoke-path header: '${xInvokePath}'`);
    console.log(`AdminLayout: Raw next-url header: '${nextUrlHeader}'`);

    if (xInvokePath) {
      actualPathname = xInvokePath;
      headersAvailable = true;
    } else if (nextUrlHeader) {
      let base = 'http://localhost'; 
      if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SITE_URL) {
        base = process.env.NEXT_PUBLIC_SITE_URL;
      }
      
      try {
        const fullUrl = new URL(nextUrlHeader, base);
        actualPathname = fullUrl.pathname;
        headersAvailable = true;
      } catch (urlParseError) {
        console.error(`AdminLayout: Error parsing next-url header ('${nextUrlHeader}') with base ('${base}'). Error:`, urlParseError);
        actualPathname = null; 
        headersAvailable = true; 
      }
    }
    
    if (headersAvailable && !actualPathname) { 
        console.warn("AdminLayout: Headers were available but pathname determination resulted in null/empty. Defaulting to '/admin/dashboard' for nav logic.");
        actualPathname = '/admin/dashboard'; 
    }

  } catch (error) {
    console.error("AdminLayout: Error accessing or processing headers. Defaulting to '/admin/dashboard' for nav logic to ensure nav shows. Error:", error);
    actualPathname = '/admin/dashboard'; 
  }

  if (!headersAvailable) { 
    console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Defaulting actualPathname to '/admin/login' to prevent issues when trying to show nav for login page.");
    actualPathname = '/admin/login'; // Default specifically to login if headers are entirely missing
  }
  
  console.log(`AdminLayout: Final determined pathname for showAdminNav logic: ${actualPathname}`);

  const showAdminNav = actualPathname !== '/admin/login';

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href={showAdminNav ? "/admin/dashboard" : "/admin/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
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
                <Layout className="h-4 w-4 mr-2" />
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
