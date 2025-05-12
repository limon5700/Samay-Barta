
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, LogOut, Megaphone } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions'; 
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session?.isAuthenticated && typeof window !== 'undefined') {
    // This check should ideally be handled by middleware for client-side navigation
    // For direct access or SSR fallback where middleware might not have run (less common for pages),
    // redirect if not on the login page itself.
    // Note: `usePathname` can't be used in server components, so direct string check or middleware is key.
    // The middleware already handles this, but this is an additional layer for direct nav.
    // The middleware already handles this, but this is an additional layer for direct nav.
    // redirect('/admin/login'); // This might cause issues if current page IS login page or during build.
    // Middleware handles this better.
  }


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
            <Button variant="default" size="sm" asChild>
              <Link href="/admin/dashboard">
                <Newspaper className="h-4 w-4 mr-2" />
                Manage Articles
              </Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/admin/advertisements">
                <Megaphone className="h-4 w-4 mr-2" />
                Manage Ads
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
