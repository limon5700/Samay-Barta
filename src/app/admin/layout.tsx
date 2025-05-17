
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, LogOut, Layout, Settings, Users, BarChart3, ShieldCheck } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions';
import type { UserSession, Permission } from '@/lib/types';
import { headers } from 'next/headers';
import { URL } from 'url'; // For robust pathname parsing

// Helper function to check if user has a specific permission
const hasPermission = (session: UserSession | null, permission: string): boolean => {
  if (!session || !session.isAuthenticated) {
    return false;
  }
  if (session.isEnvAdmin) {
    return true;
  }
  return session.permissions?.includes(permission as Permission) || false;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = headers();
  const invokePathHeader = headerList.get('x-invoke-path');
  const nextUrlHeader = headerList.get('next-url');
  
  console.log(`AdminLayout: Raw x-invoke-path header: '${invokePathHeader}'`);
  console.log(`AdminLayout: Raw next-url header: '${nextUrlHeader}'`);

  let actualPathname: string | null = null;
  let headersAvailable = false;

  if (invokePathHeader && invokePathHeader !== '/') {
    actualPathname = invokePathHeader;
    headersAvailable = true;
    console.log("AdminLayout: Using 'x-invoke-path' header as actualPathname:", actualPathname);
  } else if (nextUrlHeader) {
    try {
      const fullUrl = nextUrlHeader.startsWith('/') ? `http://localhost${nextUrlHeader}` : nextUrlHeader;
      const parsedUrl = new URL(fullUrl);
      actualPathname = parsedUrl.pathname;
      headersAvailable = true;
      console.log("AdminLayout: Using 'next-url' header. Full: '", nextUrlHeader, "', Parsed pathname:", actualPathname);
    } catch (e) {
      console.error("AdminLayout: Error parsing 'next-url' header:", nextUrlHeader, e);
      const basePath = nextUrlHeader.split('?')[0];
      actualPathname = basePath.startsWith('/') ? basePath : `/${basePath}`;
      headersAvailable = true; // Still got something from nextUrlHeader
      console.log("AdminLayout: Fallback pathname extraction from next-url:", actualPathname);
    }
  } else if (invokePathHeader) { // Fallback to invokePathHeader if nextUrlHeader was null but invokePath was '/'
     actualPathname = invokePathHeader;
     headersAvailable = true;
     console.log("AdminLayout: Using 'x-invoke-path' (as fallback, possibly '/') header as actualPathname:", actualPathname);
  }

  if (!headersAvailable) {
    console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers are missing or inconclusive. Pathname cannot be reliably determined for session logic skip. Assuming it MIGHT be login page to be safe.");
    // If headers are missing, we can't be sure it's NOT the login page.
    // To avoid the "cookies().get() on /admin/login" error, we default to behaving as if it IS the login page.
    actualPathname = '/admin/login'; // Default to login to PREVENT getSession call
  } else if (actualPathname === '' || actualPathname === null) {
    actualPathname = '/'; // Default if parsing somehow led to empty or null
    console.warn("AdminLayout: actualPathname evaluated to empty or null, defaulted to '/'.");
  }
   console.log("AdminLayout: Final determined pathname for session logic:", actualPathname);
  
  let session: UserSession | null = null;

  // Critical: Only skip getSession if we are certain it's the login page.
  // OR if headers were missing, we assume it's the login page to be safe.
  if (actualPathname === '/admin/login') {
    console.log("AdminLayout: Current path IS /admin/login (or headers were unavailable). SKIPPING getSession() call for this layout render pass.");
  } else {
    console.log(`AdminLayout: Current path is '${actualPathname}' (NOT /admin/login). Attempting to fetch session.`);
    try {
      session = await getSession();
      console.log("AdminLayout: Session object received:", session ? JSON.stringify(session, null, 2) : "null");
    } catch (error) {
      console.error("AdminLayout: CRITICAL Error fetching session:", error);
      session = null; 
    }
  }
  
  const isAuthenticated = session?.isAuthenticated || false;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href={isAuthenticated ? "/admin/dashboard" : "/admin/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          Samay Barta Lite - Admin
        </Link>
        {isAuthenticated && (
          <nav className="ml-auto flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                View Site
              </Link>
            </Button>
            
            {hasPermission(session, 'view_admin_dashboard') && (
                 <Button variant="default" size="sm" asChild>
                    <Link href="/admin/dashboard">
                        <Newspaper className="h-4 w-4 mr-2" />
                        Manage Articles
                    </Link>
                </Button>
            )}

            {hasPermission(session, 'manage_layout_gadgets') && (
                <Button variant="secondary" size="sm" asChild>
                <Link href="/admin/layout-editor">
                    <Layout className="h-4 w-4 mr-2" />
                    Layout Editor
                </Link>
                </Button>
            )}
            
            {(hasPermission(session, 'manage_users') || hasPermission(session, 'manage_roles')) && (
                <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users">
                    <Users className="h-4 w-4 mr-2" />
                    User & Role Mgmt
                </Link>
                </Button>
            )}

            {hasPermission(session, 'manage_seo_global') && (
                <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/seo">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    SEO Management
                </Link>
                </Button>
            )}
            
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

    