
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
  // console.log(`hasPermission Check: Attempting to check permission '${permission}'. Session isAuthenticated: ${session?.isAuthenticated}, isEnvAdmin: ${session?.isEnvAdmin}`);
  if (!session || !session.isAuthenticated) {
    // console.log(`hasPermission Result for '${permission}': No session or not authenticated. Returning false.`);
    return false;
  }
  if (session.isEnvAdmin) {
    // console.log(`hasPermission Result for '${permission}': Session isEnvAdmin is true. Returning true.`);
    return true; // .env admin has all permissions
  }
  const hasPerm = session.permissions?.includes(permission as Permission) || false;
  // console.log(`hasPermission Result for '${permission}': User permission found in array: ${hasPerm}. Returning ${hasPerm}. Permissions array: ${JSON.stringify(session.permissions)}`);
  return hasPerm;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = headers();
  const invokePathHeader = headerList.get('x-invoke-path');
  const nextUrlHeader = headerList.get('next-url');
  
  console.log(`AdminLayout: Raw x-invoke-path header: '${invokePathHeader}'`);
  console.log(`AdminLayout: Raw next-url header: '${nextUrlHeader}'`);

  let actualPathname = '/'; // Default to root if everything else fails

  if (invokePathHeader) {
    actualPathname = invokePathHeader;
    console.log("AdminLayout: Using 'x-invoke-path' header as actualPathname:", actualPathname);
  } else if (nextUrlHeader) {
    try {
      // Create a dummy base URL if nextUrlHeader is just a path to correctly parse it
      const fullUrl = nextUrlHeader.startsWith('/') ? `http://localhost${nextUrlHeader}` : nextUrlHeader;
      actualPathname = new URL(fullUrl).pathname;
      console.log("AdminLayout: Using 'next-url' header. Full: '", nextUrlHeader, "', Parsed pathname:", actualPathname);
    } catch (e) {
      console.error("AdminLayout: Error parsing 'next-url' header:", nextUrlHeader, e);
      // Basic fallback for pathname extraction if URL parsing fails
      const basePath = nextUrlHeader.split('?')[0];
      actualPathname = basePath.startsWith('/') ? basePath : `/${basePath}`; // Ensure it starts with a slash
      console.log("AdminLayout: Fallback pathname extraction from next-url:", actualPathname);
    }
  } else {
    console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers are missing. Defaulting actualPathname to '/'. This might indicate an issue.");
  }
  
  // Ensure actualPathname is never an empty string; default to '/' if it somehow becomes empty.
  if (actualPathname === '') {
    console.warn("AdminLayout: actualPathname was empty, defaulting to '/'.");
    actualPathname = '/';
  }
  
  console.log("AdminLayout: Final determined pathname for session logic:", actualPathname);

  let session: UserSession | null = null;

  if (actualPathname === '/admin/login') {
    console.log("AdminLayout: Path IS /admin/login. SKIPPING getSession() call for layout rendering.");
  } else {
    console.log(`AdminLayout: Path is '${actualPathname}' (NOT /admin/login). Attempting to fetch session.`);
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
}
