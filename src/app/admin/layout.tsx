
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Newspaper } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href="/" className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          Samay Barta Lite - Admin
        </Link>
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
        </nav>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">{children}</main>
       <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} Admin Panel
      </footer>
    </div>
  );
}
