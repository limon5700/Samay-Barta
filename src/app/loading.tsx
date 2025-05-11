
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <Skeleton className="h-9 w-48 mb-4 sm:mb-0 rounded-md" />
          <Skeleton className="h-10 w-full sm:w-auto max-w-md sm:max-w-xs rounded-md" />
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Category Filter Skeleton */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-md" />
          ))}
        </div>

        {/* News List Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3 p-4 border rounded-lg shadow-sm bg-card">
              <Skeleton className="h-48 w-full rounded-xl" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <Skeleton className="h-10 w-full rounded-md mt-auto" />
            </div>
          ))}
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="bg-card border-t border-border py-6 text-center">
        <div className="container mx-auto px-4 space-y-2">
          <Skeleton className="h-4 w-1/3 mx-auto rounded-md" />
          <Skeleton className="h-3 w-1/4 mx-auto rounded-md" />
        </div>
      </footer>
    </div>
  );
}
