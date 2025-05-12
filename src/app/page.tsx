
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsArticle, Category } from '@/lib/types'; // Removed Gadget, LayoutSection as they are not used directly in this UI version
import { getAllNewsArticles } from '@/lib/data'; // Removed getActiveGadgetsBySection
import { categories as allNewsCategories } from '@/lib/constants';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsList from '@/components/news/NewsList';
import CategoryFilter from '@/components/news/CategoryFilter';
// import AdDisplay from '@/components/ads/AdDisplay'; // Removed AdDisplay import as gadgets are not rendered this way now
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
// import { Card } from '@/components/ui/card'; // Removed Card import if not used directly for layout

export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  // Removed state for activeGadgets as the complex gadget rendering is removed from homepage UI
  // const [activeGadgets, setActiveGadgets] = useState<Record<LayoutSection, Gadget[]>>({ ... });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { getUIText, isClient } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!isClient) return;
      setIsPageLoading(true);
      try {
        // Fetch only articles for the homepage list
        const fetchedArticles = await getAllNewsArticles();
        // Ensure articles are sorted by date, descending (newest first)
        const sortedArticles = (Array.isArray(fetchedArticles) ? fetchedArticles : [])
                                .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
        setArticles(sortedArticles);

        // Gadget fetching logic removed from this component as UI is simplified

      } catch (error) {
        console.error("Failed to fetch articles:", error);
        toast({ title: "Error", description: "Failed to load page content.", variant: "destructive" });
        setArticles([]);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, toast]); // Dependencies updated

  const filteredArticles = useMemo(() => {
    const safeArticles = Array.isArray(articles) ? articles : [];
    return safeArticles
      .filter(article =>
        selectedCategory === 'All' || article.category === selectedCategory
      )
      .filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (typeof article.category === 'string' && article.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [articles, searchTerm, selectedCategory]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleSelectCategory = useCallback((category: Category | 'All') => {
    setSelectedCategory(category);
  }, []);

  // Gadget rendering function removed as it's not used in this simplified UI
  // const renderGadgetsForSection = (section: LayoutSection, className?: string) => { ... };

  // Simplified Page Skeleton for the reverted design
  const PageSkeleton = () => (
     <div className="container mx-auto px-4 py-8">
       {/* Category Filter Skeleton */}
       <div className="mb-8 flex flex-wrap gap-2 justify-center">
         {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-md" />)}
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
     </div>
   );


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Header remains the same */}
      {/* Gadget rendering logic removed from header area */}
      <Header onSearch={handleSearch} />
      {/* Gadget rendering logic removed from below header area */}

      <main className="flex-grow container mx-auto px-4 py-8">
        {isPageLoading ? (
          <PageSkeleton />
        ) : (
          <>
             {/* Removed sidebar and complex layout structure */}
             {/* Render CategoryFilter */}
             <CategoryFilter
               categories={allNewsCategories}
               selectedCategory={selectedCategory}
               onSelectCategory={handleSelectCategory}
             />
             {/* Render NewsList */}
             {filteredArticles.length > 0 ? (
               <NewsList articles={filteredArticles} />
             ) : (
               <p className="text-center text-muted-foreground mt-16 text-xl">
                 {getUIText("noArticlesFound")}
               </p>
             )}
           </>
        )}
      </main>

       {/* Footer remains the same */}
       {/* Gadget rendering logic removed from footer area */}
      <Footer />
    </div>
  );
}
