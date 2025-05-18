
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, LogOut, Layout, Users, BarChart3 } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions';
import type { UserSession, Permission } from '@/lib/types';

const hasPermission = (session: UserSession | null, permission: string): boolean => {
  if (!session || !session.isAuthenticated) {
    console.log(`hasPermission Check for '${permission}': Session is null or not authenticated. Returning false.`);
    return false;
  }
  if (session.isEnvAdmin) {
    console.log(`hasPermission Check for '${permission}': Session isEnvAdmin is true. Returning true.`);
    return true;
  }
  const hasPerm = session.permissions?.includes(permission as Permission) || false;
  console.log(`hasPermission Check for '${permission}': User has permission? ${hasPerm}. Permissions array: [${session.permissions?.join(', ')}]`);
  return hasPerm;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing...");

  let actualPathname: string | null = null;
  let headersAvailable = false;
  try {
    const headersList = headers(); // This should be called within try-catch
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
        actualPathname = nextUrlHeader; 
        headersAvailable = true;
      }
    }
    
    if (!actualPathname && headersAvailable) { 
        console.warn("AdminLayout: Headers were available but pathname determination resulted in null. Defaulting to '/admin/login'.");
        actualPathname = '/admin/login'; 
    }

  } catch (error) {
    console.error("AdminLayout: Error accessing headers. Defaulting pathname to '/admin/login'. Error:", error);
    actualPathname = '/admin/login'; 
  }

  if (!headersAvailable && !actualPathname) { 
    console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Defaulting actualPathname to '/admin/login'.");
    actualPathname = '/admin/login'; 
  }
  
  console.log(`AdminLayout: Final determined pathname for session logic: ${actualPathname}`);

  let session: UserSession | null = null;
  if (actualPathname !== '/admin/login') {
    console.log(`AdminLayout: Path is '${actualPathname}' (NOT /admin/login). Attempting to fetch session.`);
    try {
      session = await getSession();
      console.log(`AdminLayout: Session object received for path ${actualPathname}:`, session ? JSON.stringify({ 
        isAuthenticated: session.isAuthenticated, 
        username: session.username, 
        isEnvAdmin: session.isEnvAdmin,
        roles: session.roles,
        permissionsCount: session.permissions?.length 
      }, null, 2) : "null");
    } catch (error) {
      console.error(`AdminLayout: CRITICAL Error fetching session for path ${actualPathname}:`, error);
      session = null; 
    }
  } else {
    console.log(`AdminLayout: Current path IS /admin/login (or headers were unavailable and defaulted to it). SKIPPING getSession() call for this layout render pass.`);
  }
  
  const isAuthenticated = session?.isAuthenticated || false;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href={isAuthenticated ? "/admin/dashboard" : "/admin/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
          Samay Barta Lite - Admin
        </Link>
        {isAuthenticated && (
          <nav className="ml-auto flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" prefetch={false}>
                <Home className="h-4 w-4 mr-2" />
                View Site
              </Link>
            </Button>
            
            {hasPermission(session, 'view_admin_dashboard') && (
                 <Button variant="default" size="sm" asChild>
                    <Link href="/admin/dashboard" prefetch={false}>
                        <Newspaper className="h-4 w-4 mr-2" />
                        Manage Articles
                    </Link>
                </Button>
            )}

            {hasPermission(session, 'manage_layout_gadgets') && (
                <Button variant="secondary" size="sm" asChild>
                <Link href="/admin/layout-editor" prefetch={false}>
                    <Layout className="h-4 w-4 mr-2" />
                    Layout Editor
                </Link>
                </Button>
            )}
            
            {(hasPermission(session, 'manage_users') || hasPermission(session, 'manage_roles')) && (
                <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users" prefetch={false}>
                    <Users className="h-4 w-4 mr-2" />
                    User & Role Mgmt
                </Link>
                </Button>
            )}

            {hasPermission(session, 'manage_seo_global') && (
                <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/seo" prefetch={false}>
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


    