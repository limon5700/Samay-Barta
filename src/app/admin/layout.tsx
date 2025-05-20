
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, BarChart3, LogOut, Users, ShieldCheck, Activity } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions';
import type { UserSession, Permission } from '@/lib/types';

// Helper function to check permissions
function hasPermission(requiredPermission: Permission, userPermissions: Permission[] = []): boolean {
  return userPermissions.includes(requiredPermission);
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing...");

  let actualPathname = '';
  let showAdminNav = true;
  let headersAvailable = false;
  let errorOccurredFetchingHeaders = false;
  let session: UserSession | null = null;

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
        console.warn("AdminLayout: Error parsing next-url header. Path might be ambiguous. Error:", e);
      }
    }

    if (!headersAvailable) {
      console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Defaulting actualPathname to '/admin/login' to prevent issues.");
      actualPathname = '/admin/login'; 
    }
  } catch (error: any) {
    console.error("AdminLayout: Error accessing or processing headers. Defaulting actualPathname to '/admin/login'. Error:", error);
    actualPathname = '/admin/login'; 
    errorOccurredFetchingHeaders = true;
  }

  console.log(`AdminLayout: Final determined pathname for showAdminNav logic: ${actualPathname}`);

  if (actualPathname === '/admin/login') {
    showAdminNav = false;
  } else {
    // Fetch session only if not on login page and headers were available
    // If headers were NOT available and we defaulted to /admin/login, showAdminNav is already false.
    if(headersAvailable || !errorOccurredFetchingHeaders){
        console.log("AdminLayout: Attempting to call getSession().");
        session = await getSession();
        console.log("AdminLayout: Session object received:", session);
        if (!session?.isAuthenticated) {
            // This case should ideally be caught by middleware, but as a fallback.
            // However, for RBAC, even if authenticated, links depend on permissions.
            // No explicit redirect here; middleware handles unauth access to protected routes.
            // Links will be hidden based on permissions below.
        }
    } else {
        console.log("AdminLayout: Headers were unavailable or errored, and path defaulted to /admin/login. SKIPPING getSession() call for this layout render pass for nav links, assuming no session.");
    }
  }
  if (errorOccurredFetchingHeaders && actualPathname === '/admin/login') {
    showAdminNav = false;
  }

  const userPermissions = session?.isSuperAdmin ? availablePermissions : (session?.permissions || []);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href="/admin/dashboard" className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
          Samay Barta Lite - Admin {session?.username ? `(${session.username})` : ''}
        </Link>
        {showAdminNav && session?.isAuthenticated && (
          <nav className="ml-auto flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" prefetch={false}>
                <Home className="h-4 w-4 mr-2" />
                View Site
              </Link>
            </Button>

            {hasPermission('view_admin_dashboard', userPermissions) && (
              <Button variant="default" size="sm" asChild>
                <Link href="/admin/dashboard" prefetch={false}>
                  <Newspaper className="h-4 w-4 mr-2" />
                  Manage Articles
                </Link>
              </Button>
            )}

            {hasPermission('manage_layout_gadgets', userPermissions) && (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/admin/layout-editor" prefetch={false}>
                  <LayoutIcon className="h-4 w-4 mr-2" />
                  Layout Editor
                </Link>
              </Button>
            )}

            {(hasPermission('manage_users', userPermissions) || hasPermission('manage_roles', userPermissions)) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users" prefetch={false}>
                  <Users className="h-4 w-4 mr-2" />
                  User & Role Mgmt
                </Link>
              </Button>
            )}
             {hasPermission('manage_roles', userPermissions) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/roles" prefetch={false}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Manage Roles
                </Link>
              </Button>
            )}


            {hasPermission('manage_seo_global', userPermissions) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/seo" prefetch={false}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  SEO Management
                </Link>
              </Button>
            )}
            
            {/* Placeholder for Activity Log link if permission exists */}
            {/* {hasPermission('view_activity_log', userPermissions) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/activity-log" prefetch={false}>
                  <Activity className="h-4 w-4 mr-2" />
                  Activity Log
                </Link>
              </Button>
            )} */}


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
