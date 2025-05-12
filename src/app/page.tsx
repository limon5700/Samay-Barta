
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsArticle, Category, Gadget, LayoutSection } from '@/lib/types'; // Use Gadget, LayoutSection
import { getAllNewsArticles, getActiveGadgetsBySection } from '@/lib/data'; // Use getActiveGadgetsBySection
import { categories as allNewsCategories } from '@/lib/constants';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsList from '@/components/news/NewsList';
import CategoryFilter from '@/components/news/CategoryFilter';
import AdDisplay from '@/components/ads/AdDisplay'; // AdDisplay now handles Gadgets
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  // State to hold *all* active gadgets for each relevant placement
  const [activeGadgets, setActiveGadgets] = useState<Record<LayoutSection, Gadget[]>>({
      'homepage-top': [],
      'article-top': [],
      'article-bottom': [],
      'sidebar-left': [],
      'sidebar-right': [],
      'footer': [],
      'article-inline': [],
      'header-logo-area': [],
      'below-header': [],
      // Add other sections as needed
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

        // Define homepage-relevant sections
        const sectionsToFetch: LayoutSection[] = [
          'homepage-top',
          'sidebar-left',
          'sidebar-right',
          'footer',
          'header-logo-area',
          'below-header',
          // Add others if they appear on the homepage
        ];

        // Fetch all active gadgets for these sections concurrently
        const gadgetFetchPromises = sectionsToFetch.map(section =>
          getActiveGadgetsBySection(section)
        );
        const gadgetsBySectionArrays = await Promise.all(gadgetFetchPromises);

        // Store the fetched gadgets in state
        const newActiveGadgets: Record<LayoutSection, Gadget[]> = { ...activeGadgets }; // Start with empty/previous state
         sectionsToFetch.forEach((section, index) => {
            newActiveGadgets[section] = gadgetsBySectionArrays[index] || [];
         });
         setActiveGadgets(newActiveGadgets);

      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Failed to load page content.", variant: "destructive" });
        setArticles([]);
        // Reset gadgets on error
        const resetGadgets: Record<LayoutSection, Gadget[]> = {} as any;
        Object.keys(activeGadgets).forEach(key => {
            resetGadgets[key as LayoutSection] = [];
        });
        setActiveGadgets(resetGadgets);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, toast]); // Dependencies

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

  // --- Render Gadgets Helper ---
  const renderGadgetsForSection = (section: LayoutSection, className?: string) => {
    const gadgets = activeGadgets[section] || [];
    if (gadgets.length === 0) return null;
    return (
      <div className={`section-${section}-container ${className || ''}`}>
        {gadgets.map((gadget) => (
          <AdDisplay key={gadget.id} gadget={gadget} className="mb-4" /> // Add margin between gadgets
        ))}
      </div>
    );
  };

  const PageSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
         {/* Left Sidebar Skeleton */}
        <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-4">
            <Skeleton className="h-48 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
        </aside>

         {/* Main Content Skeleton */}
         <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
            {/* Top Gadget Area Skeleton */}
            <Skeleton className="h-24 md:h-32 w-full mb-6 rounded-md" />
            {/* Category Filter Skeleton */}
            <div className="mb-8 flex flex-wrap gap-2 justify-center">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-md" />)}
            </div>
             {/* News List Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
         <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-4">
            <Skeleton className="h-64 w-full rounded-md" />
             <Skeleton className="h-40 w-full rounded-md" />
        </aside>
      </div>
      {/* Footer Ad Skeleton */}
      <Skeleton className="h-16 w-full mt-6 rounded-md container mx-auto px-4 mb-4" />
    </div>
  );


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Render gadgets in Header sections if defined */}
      {renderGadgetsForSection('header-logo-area', 'container mx-auto px-4 pt-4')}
      <Header onSearch={handleSearch} />
      {renderGadgetsForSection('below-header', 'container mx-auto px-4 pt-4')}

      <main className="flex-grow">
        {isPageLoading ? (
          <PageSkeleton />
        ) : (
          <div className="container mx-auto px-4 py-8">
             <div className="flex flex-col md:flex-row gap-8">
                 {/* Left Sidebar */}
                 <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-6">
                     {/* Render all gadgets for the left sidebar */}
                     {renderGadgetsForSection('sidebar-left')}
                     {/* Placeholder for other non-gadget sidebar content */}
                     {activeGadgets['sidebar-left']?.length === 0 && ( // Show placeholder only if no ads
                         <Card className="p-4 bg-muted/30">
                            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Left Sidebar</h3>
                            <p className="text-xs text-muted-foreground">Other content goes here.</p>
                         </Card>
                     )}
                </aside>

                 {/* Main Content Area */}
                 <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
                    {/* Render all gadgets for homepage top */}
                    {renderGadgetsForSection('homepage-top', 'mb-6')}

                    <CategoryFilter
                      categories={allNewsCategories}
                      selectedCategory={selectedCategory}
                      onSelectCategory={handleSelectCategory}
                    />
                    {filteredArticles.length > 0 ? (
                      <NewsList articles={filteredArticles} />
                    ) : (
                      <p className="text-center text-muted-foreground mt-16 text-xl">
                        {getUIText("noArticlesFound")}
                      </p>
                    )}
                 </div>

                 {/* Right Sidebar */}
                 <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-6">
                    {/* Render all gadgets for the right sidebar */}
                    {renderGadgetsForSection('sidebar-right')}
                     {/* Placeholder for other non-gadget sidebar content */}
                     {activeGadgets['sidebar-right']?.length === 0 && ( // Show placeholder only if no ads
                        <Card className="p-4 bg-muted/30">
                            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Right Sidebar</h3>
                            <p className="text-xs text-muted-foreground">Other content goes here.</p>
                        </Card>
                     )}
                </aside>
            </div>
          </div>
        )}
      </main>
       {/* Footer Gadget Placement */}
       {renderGadgetsForSection('footer', 'container mx-auto px-4 pt-4')}
      <Footer />
    </div>
  );
}
