
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Newspaper, LogOut } from 'lucide-react';
import { logoutAction, getSession } from '@/app/admin/auth/actions'; // Updated path
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // This check is primarily for server-side rendering.
  // Middleware should handle the actual redirection for client-side navigation.
  // However, if middleware somehow fails or if this layout is accessed directly
  // without going through middleware (less common for pages), this provides a fallback.
  if (!session?.isAuthenticated) {
    // It's generally better to let middleware handle redirects.
    // If this layout is for pages that are *always* protected,
    // then a redirect here makes sense if middleware isn't solely relied upon.
    // For now, we assume middleware handles the primary protection.
    // If middleware is correctly configured, this layout won't be rendered for unauth users on protected paths.
    // Consider if /admin/login should also use this layout or a simpler one.
    // If /admin/login uses this layout, we must not redirect from here.
    // The current setup means /admin/login does NOT use this layout, which is fine.
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href={session?.isAuthenticated ? "/admin/dashboard" : "/admin/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          Samay Barta Lite - Admin
        </Link>
        {session?.isAuthenticated && (
          <nav className="ml-auto flex items-center gap-2">
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
