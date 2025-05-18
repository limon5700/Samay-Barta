
import type { ReactNode } from 'react';
import Link from 'next/link';
// import { headers as nextHeaders } from 'next/headers'; // No longer needed for path detection for nav
import { Button } from '@/components/ui/button';
import { Home, Newspaper, Layout as LayoutIcon, Users, BarChart3 } from 'lucide-react'; // Renamed Layout to LayoutIcon
// import { logoutAction } from '@/app/admin/auth/actions'; // Logout button removed

export default async function AdminLayout({ children }: { children: ReactNode }) {
  console.log("AdminLayout: Initializing (Authentication Bypassed)...");

  // Since auth is bypassed, we always show the admin navigation.
  // The distinction for the login page is handled by redirecting from /admin/login itself.

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href="/admin/dashboard" className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity" prefetch={false}>
          Samay Barta Lite - Admin
        </Link>
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
              <LayoutIcon className="h-4 w-4 mr-2" />
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
          
          {/* Logout button removed as authentication is bypassed */}
          {/* 
          <form action={logoutAction}>
            <Button variant="destructive" size="sm" type="submit" className="gap-1.5">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </form> 
          */}
        </nav>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">{children}</main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} Samay Barta Lite Admin Panel
      </footer>
    </div>
  );
}
