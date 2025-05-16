
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, LogOut, Layout, Settings, Users, BarChart3, ShieldCheck } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions';
import type { UserSession, Permission } from '@/lib/types';
import { headers } from 'next/headers'; // Import headers

// Helper function to check if user has a specific permission
const hasPermission = (session: UserSession | null, permission: string): boolean => {
  if (!session) return false;
  if (session.isEnvAdmin) return true; // .env admin has all permissions
  return session.permissions?.includes(permission as any) || false;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = headers();
  const pathname = headerList.get('next-url') || ''; // Get current pathname

  let session: UserSession | null = null;

  // Only attempt to get session if not on the login page itself
  if (pathname !== '/admin/login') {
    try {
      session = await getSession();
    } catch (error) {
      console.error("CRITICAL: Error fetching session in AdminLayout:", error);
      // In a production scenario, you might want to redirect to an error page or show a generic error message.
      // For now, this will log the error on the server. The page might still fail to render correctly.
      session = null; // Treat as no session if an error occurs
    }
  }
  // For the /admin/login page, session remains null, which is appropriate for the layout.

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href={session?.isAuthenticated ? "/admin/dashboard" : "/admin/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          Samay Barta Lite - Admin
        </Link>
        {session?.isAuthenticated && (
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
                    <Users className="h-4 w-4 mr-2" /> {/* Combined for simplicity now */}
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
