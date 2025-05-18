
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, LogOut, Layout, Users, BarChart3 } from 'lucide-react'; // Removed Settings and ShieldCheck as they were not used
import { logoutAction, getSession } from '@/app/admin/auth/actions';
import type { UserSession, Permission } from '@/lib/types';
import { headers } from 'next/headers';
import { URL } from 'url'; 

const hasPermission = (session: UserSession | null, permission: string): boolean => {
  if (!session || !session.isAuthenticated) {
    // console.log(`hasPermission for '${permission}': Session not authenticated. Returning false.`);
    return false;
  }
  if (session.isEnvAdmin) {
    // console.log(`hasPermission for '${permission}': Session isEnvAdmin is true. Returning true.`);
    return true;
  }
  const hasPerm = session.permissions?.includes(permission as Permission) || false;
  // console.log(`hasPermission for '${permission}': User has permission: ${hasPerm}. Permissions list: ${session.permissions?.join(', ')}`);
  return hasPerm;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = headers();
  let actualPathname: string | null = null;
  let headersAvailable = false;

  console.log("AdminLayout: Initializing...");

  try {
    const invokePathHeader = headerList.get('x-invoke-path');
    const nextUrlHeader = headerList.get('next-url');
    
    console.log(`AdminLayout: Raw x-invoke-path header: '${invokePathHeader}'`);
    console.log(`AdminLayout: Raw next-url header: '${nextUrlHeader}'`);

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
        // Fallback for potentially malformed next-url
        const basePath = nextUrlHeader.split('?')[0];
        actualPathname = basePath.startsWith('/') ? basePath : `/${basePath}`;
        headersAvailable = true;
        console.log("AdminLayout: Fallback pathname extraction from next-url:", actualPathname);
      }
    } else if (invokePathHeader === '/') {
       actualPathname = invokePathHeader;
       headersAvailable = true;
       console.log("AdminLayout: Using 'x-invoke-path' (value was '/') header as actualPathname:", actualPathname);
    }

    if (!headersAvailable) {
      console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers are missing or inconclusive. Defaulting actualPathname to '/admin/login' to prevent cookie errors on login page.");
      actualPathname = '/admin/login'; 
    } else if (actualPathname === '' || actualPathname === null) {
      actualPathname = '/'; 
      console.warn("AdminLayout: actualPathname evaluated to empty or null after header checks, defaulted to '/'. This could indicate an issue with header parsing.");
    }
  } catch (error) {
    console.error("AdminLayout: CRITICAL ERROR reading headers or determining pathname:", error);
    console.warn("AdminLayout: Defaulting actualPathname to '/admin/login' due to critical error to prevent session issues on login page.");
    actualPathname = '/admin/login'; // Safe default in case of any error during header processing
  }
   
  console.log("AdminLayout: Final determined pathname for session logic:", actualPathname);
  
  let session: UserSession | null = null;

  if (actualPathname === '/admin/login') {
    console.log("AdminLayout: Current path IS /admin/login. SKIPPING getSession() call for this layout render pass.");
  } else {
    console.log(`AdminLayout: Current path is '${actualPathname}' (NOT /admin/login). Attempting to fetch session.`);
    try {
      session = await getSession();
      // console.log("AdminLayout: Session object received:", session ? JSON.stringify(session, null, 2) : "null");
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
