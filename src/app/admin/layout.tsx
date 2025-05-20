
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers as nextHeaders } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, BarChart3, LogOut, Users, ShieldCheck, Activity } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions';
import type { UserSession, Permission } from '@/lib/types';
import { availablePermissions } from '@/lib/constants'; // Ensure this is available if used for SuperAdmin

// Helper function to check permissions
function hasPermission(requiredPermission: Permission, userPermissions: Permission[] = []): boolean {
  return userPermissions.includes(requiredPermission);
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing...");

  let session: UserSession | null = null;
  try {
    session = await getSession();
    console.log("AdminLayout: Session object received:", session);
  } catch (error) {
    console.error("AdminLayout: Error calling getSession():", error);
    // session remains null, which is handled by the rendering logic
  }

  let actualPathname = '';
  let headersAvailable = false;
  // No need for errorOccurredFetchingHeaders as a separate flag here,
  // if headers are not available, actualPathname will remain empty or default.

  try {
    const headersList = await nextHeaders(); // Ensure await if your TS env needs it
    const xInvokePath = headersList.get('x-invoke-path');
    const nextUrlPath = headersList.get('next-url');

    console.log(`AdminLayout: Raw x-invoke-path header: '${xInvokePath}'`);
    console.log(`AdminLayout: Raw next-url header: '${nextUrlPath}'`);

    if (xInvokePath && xInvokePath !== 'null' && xInvokePath.trim() !== '') {
      actualPathname = xInvokePath.trim();
      headersAvailable = true;
    } else if (nextUrlPath && nextUrlPath !== 'null' && nextUrlPath.trim() !== '') {
      try {
        // Ensure a base URL if nextUrlPath is just a pathname (e.g., starts with '/')
        const base = nextUrlPath.startsWith('/') ? 'http://localhost' : undefined;
        const url = new URL(nextUrlPath, base);
        actualPathname = url.pathname.trim();
        headersAvailable = true;
      } catch (e) {
        console.warn("AdminLayout: Error parsing next-url header. Path might be ambiguous. Error:", e);
        // actualPathname remains empty
      }
    }

    if (!headersAvailable) {
      console.warn("AdminLayout: Both 'x-invoke-path' and 'next-url' headers were missing or inconclusive. Pathname will be determined as empty or from another source if available.");
      // If no headers are found, actualPathname will be ''.
      // This is fine, as '' !== '/admin/login' will be true.
      // Middleware should handle unauthenticated access to paths that are not '/admin/login'.
    }
  } catch (error: any) {
    console.error("AdminLayout: Error accessing or processing headers. Pathname detection may be impacted. Error:", error);
    // actualPathname remains empty
  }

  console.log(`AdminLayout: Final determined pathname for nav logic: '${actualPathname}'`);

  // Show admin navigation if user is authenticated AND not on the login page.
  // Middleware should prevent unauthenticated access to other admin pages.
  const showAdminNav = session?.isAuthenticated && actualPathname !== '/admin/login';
  console.log(`AdminLayout: session?.isAuthenticated: ${session?.isAuthenticated}, actualPathname: '${actualPathname}', Resulting showAdminNav: ${showAdminNav}`);

  const userPermissions = session?.isSuperAdmin ? availablePermissions : (session?.permissions || []);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href="/admin/dashboard" className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
          Samay Barta Lite - Admin {session?.username ? `(${session.username})` : ''}
        </Link>
        {showAdminNav && (
          <nav className="ml-auto flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" prefetch={false}>
                <Home className="h-4 w-4 mr-2" />
                View Site
              </Link>
            </Button>

            {/* For SuperAdmin, they should see all tools. */}
            {/* If RBAC is in place, permissions array would be checked. */}
            {/* Current simplified logic: if authenticated and not on login page, show all tools. */}

            {/* Manage Articles link */}
            {(session?.isSuperAdmin || hasPermission('view_admin_dashboard', userPermissions)) && (
              <Button variant="default" size="sm" asChild>
                <Link href="/admin/dashboard" prefetch={false}>
                  <Newspaper className="h-4 w-4 mr-2" />
                  Manage Articles
                </Link>
              </Button>
            )}

            {/* Layout Editor link */}
            {(session?.isSuperAdmin || hasPermission('manage_layout_gadgets', userPermissions)) && (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/admin/layout-editor" prefetch={false}>
                  <LayoutIcon className="h-4 w-4 mr-2" />
                  Layout Editor
                </Link>
              </Button>
            )}

            {/* User & Role Management link */}
            {(session?.isSuperAdmin || hasPermission('manage_users', userPermissions) || hasPermission('manage_roles', userPermissions)) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users" prefetch={false}>
                  <Users className="h-4 w-4 mr-2" />
                  User & Role Mgmt
                </Link>
              </Button>
            )}
            
            {/* Manage Roles link */}
            {(session?.isSuperAdmin || hasPermission('manage_roles', userPermissions)) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/roles" prefetch={false}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Manage Roles
                </Link>
              </Button>
            )}

            {/* SEO Management link */}
            {(session?.isSuperAdmin || hasPermission('manage_seo_global', userPermissions)) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/seo" prefetch={false}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  SEO Management
                </Link>
              </Button>
            )}
            
            {/* Placeholder for Activity Log link */}
            {/* {(session?.isSuperAdmin || hasPermission('view_activity_log', userPermissions)) && (
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
