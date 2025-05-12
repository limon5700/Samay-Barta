
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsArticle, Category, Advertisement, AdPlacement } from '@/lib/types';
import { getAllNewsArticles, getAdsByPlacement } from '@/lib/data'; // Updated data import
import { categories as allNewsCategories } from '@/lib/constants';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsList from '@/components/news/NewsList';
import CategoryFilter from '@/components/news/CategoryFilter';
import AdDisplay from '@/components/ads/AdDisplay';
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card'; // Import Card for sidebar placeholders


// Helper function to select a random ad from an array
const getRandomAd = (ads: Advertisement[]): Advertisement | null => {
  if (!ads || ads.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * ads.length);
  return ads[randomIndex];
};


export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  // State to hold the *selected* ad for each placement
   const [selectedAds, setSelectedAds] = useState<Record<AdPlacement, Advertisement | null>>({
      'homepage-top': null,
      'article-top': null, // Keep all placements for type safety
      'article-bottom': null,
      'sidebar-left': null,
      'sidebar-right': null,
      'footer': null,
      'article-inline': null,
      'popup': null,
      'native': null,
  });

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
        // Fetch articles
        const fetchedArticles = await getAllNewsArticles();
        setArticles(fetchedArticles);

        // Fetch ads for all relevant homepage placements concurrently
        const placementsToFetch: AdPlacement[] = [
          'homepage-top',
          'sidebar-left',
          'sidebar-right',
          'footer'
        ];
        const adFetchPromises = placementsToFetch.map(placement => getAdsByPlacement(placement)); // No articleId needed for homepage
        const adsByPlacementArrays = await Promise.all(adFetchPromises);

        // Select one random ad for each placement
        const newSelectedAds: Record<AdPlacement, Advertisement | null> = { ...selectedAds };
        placementsToFetch.forEach((placement, index) => {
            newSelectedAds[placement] = getRandomAd(adsByPlacementArrays[index]);
        });
         setSelectedAds(newSelectedAds);

      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Failed to load page content.", variant: "destructive" });
        setArticles([]);
        setSelectedAds({ // Reset ads on error
            'homepage-top': null, 'article-top': null, 'article-bottom': null, 'sidebar-left': null,
            'sidebar-right': null, 'footer': null, 'article-inline': null, 'popup': null, 'native': null,
        });
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, toast]); // selectedAds removed

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

  // --- Memoized Ad Components ---
  const TopAdComponent = useMemo(() => selectedAds['homepage-top'] ? <AdDisplay ad={selectedAds['homepage-top']} className="mb-6" /> : null, [selectedAds]);
  const SidebarLeftAdComponent = useMemo(() => selectedAds['sidebar-left'] ? <AdDisplay ad={selectedAds['sidebar-left']} className="mb-4" /> : null, [selectedAds]);
  const SidebarRightAdComponent = useMemo(() => selectedAds['sidebar-right'] ? <AdDisplay ad={selectedAds['sidebar-right']} className="mb-4" /> : null, [selectedAds]);
  const FooterAdComponent = useMemo(() => selectedAds['footer'] ? <AdDisplay ad={selectedAds['footer']} className="mt-6 container mx-auto px-4" /> : null, [selectedAds]);


  const PageSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
         {/* Left Sidebar Skeleton */}
        <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first">
            <Skeleton className="h-48 w-full mb-4 rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
        </aside>

         {/* Main Content Skeleton */}
         <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
            <Skeleton className="h-24 md:h-32 w-full mb-6 rounded-md" /> {/* Top Ad */}
            <div className="mb-8 flex flex-wrap gap-2 justify-center">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-md" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Adjusted grid for main area */}
                {[...Array(4)].map((_, i) => (
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

         {/* Right Sidebar Skeleton */}
         <aside className="w-full md:w-1/4 lg:w-1/5 order-last">
            <Skeleton className="h-64 w-full mb-4 rounded-md" />
             <Skeleton className="h-40 w-full rounded-md" />
        </aside>
      </div>
      {/* Footer Ad Skeleton */}
      <Skeleton className="h-16 w-full mt-6 rounded-md container mx-auto px-4 mb-4" />
    </div>
  );


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Header onSearch={handleSearch} />
      <main className="flex-grow">
        {isPageLoading ? (
          <PageSkeleton />
        ) : (
          <div className="container mx-auto px-4 py-8">
             <div className="flex flex-col md:flex-row gap-8">
                 {/* Left Sidebar */}
                 <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-6">
                     {SidebarLeftAdComponent}
                     {/* Placeholder for other sidebar content */}
                     <Card className="p-4 bg-muted/30">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Left Sidebar</h3>
                        <p className="text-xs text-muted-foreground">Other content goes here.</p>
                     </Card>
                </aside>

                 {/* Main Content Area */}
                 <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
                    {/* Display the top ad if available */}
                    {TopAdComponent}

                    <CategoryFilter
                      categories={allNewsCategories}
                      selectedCategory={selectedCategory}
                      onSelectCategory={handleSelectCategory}
                    />
                    {filteredArticles.length > 0 ? (
                       // Adjust grid columns if sidebars take space: lg:grid-cols-2 or even 1 if narrow
                      <NewsList articles={filteredArticles} />
                    ) : (
                      <p className="text-center text-muted-foreground mt-16 text-xl">
                        {getUIText("noArticlesFound")}
                      </p>
                    )}
                 </div>

                 {/* Right Sidebar */}
                 <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-6">
                    {SidebarRightAdComponent}
                    {/* Placeholder for other sidebar content */}
                    <Card className="p-4 bg-muted/30">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Right Sidebar</h3>
                         <p className="text-xs text-muted-foreground">Other content goes here.</p>
                     </Card>
                </aside>
            </div>
          </div>
        )}
      </main>
       {/* Footer Ad Placement */}
       {FooterAdComponent}
      <Footer />
    </div>
  );
}
