
"use client";

import type { Metadata } from 'next';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsArticle, Category, Gadget, LayoutSection } from '@/lib/types';
import { getAllNewsArticles, getActiveGadgetsBySection, getSeoSettings } from '@/lib/data';
import { categories as allNewsCategories } from '@/lib/constants';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsList from '@/components/news/NewsList';
import CategoryFilter from '@/components/news/CategoryFilter';
import AdDisplay from '@/components/ads/AdDisplay';
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Metadata generation is typically handled by `layout.tsx` for client components,
// or this page would need to be a Server Component if dynamic metadata from `getSeoSettings` is critical here.
// Assuming `layout.tsx` provides sufficient default SEO.

export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [activeGadgets, setActiveGadgets] = useState<Record<LayoutSection, Gadget[]>>({
    'homepage-top': [], 'homepage-content-bottom': [], 'homepage-article-interstitial': [],
    'article-top': [], 'article-bottom': [],  'sidebar-left': [], 'sidebar-right': [],
    'footer': [], 'article-inline': [], 'header-logo-area': [], 'below-header': [],
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
        const fetchedArticles = await getAllNewsArticles();
        const sortedArticles = (Array.isArray(fetchedArticles) ? fetchedArticles : [])
          .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
        setArticles(sortedArticles);

        const sectionsToFetch: LayoutSection[] = [
          'homepage-top', 'homepage-content-bottom', 'homepage-article-interstitial',
          'sidebar-left', 'sidebar-right', 'footer', 'header-logo-area', 'below-header',
        ];
        const gadgetPromises = sectionsToFetch.map(section => getActiveGadgetsBySection(section));
        const gadgetResults = await Promise.all(gadgetPromises);
        
        const newActiveGadgets: Partial<Record<LayoutSection, Gadget[]>> = {};
        sectionsToFetch.forEach((section, index) => {
          newActiveGadgets[section] = gadgetResults[index] || [];
        });
        setActiveGadgets(prev => ({...prev, ...newActiveGadgets}));

      } catch (error) {
        console.error("Failed to fetch articles or gadgets:", error);
        toast({ title: getUIText("error") || "Error", description: "Failed to load page content.", variant: "destructive" });
        setArticles([]);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, toast, getUIText]);

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

  const renderGadgetsForSection = (section: LayoutSection, className?: string) => {
    const gadgets = activeGadgets[section] || [];
    if (gadgets.length === 0) return null;
    return (
      <div className={`section-gadgets section-${section}-container ${className || ''} space-y-4`}>
        {gadgets.map((gadget) => (
          <AdDisplay key={gadget.id} gadget={gadget} />
        ))}
      </div>
    );
  };

  const PageSkeleton = () => (
    <div className="flex flex-col min-h-screen">
      <Skeleton className="h-16 w-full mb-4 rounded-none" />
      <div className="container mx-auto px-4"><Skeleton className="h-24 w-full mb-6 rounded-md" /></div>
      <div className="container mx-auto px-4 flex-grow">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-1/5 lg:w-[15%] order-2 md:order-1 space-y-4">
            <Skeleton className="h-48 w-full rounded-md" /> <Skeleton className="h-32 w-full rounded-md" />
          </aside>
          <div className="w-full md:w-3/5 lg:w-[70%] order-1 md:order-2">
            <div className="mb-8 flex flex-wrap gap-2 justify-center">
              {[...Array(5)].map((_, i) => <Skeleton key={`cat-skel-${i}`} className="h-10 w-24 rounded-md" />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"> {/* Ensure 4 columns for skeleton too */}
              {[...Array(8)].map((_, i) => ( // Display 8 skeletons for a 4-column layout to show 2 rows
                <div key={`news-skel-${i}`} className="flex flex-col space-y-3 p-4 border rounded-lg shadow-sm bg-card">
                  <Skeleton className="h-40 w-full rounded-xl" />
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-6 w-3/4" /> <Skeleton className="h-4 w-1/2" /> <Skeleton className="h-4 w-5/6" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-md mt-auto" />
                </div>
              ))}
            </div>
          </div>
          <aside className="w-full md:w-1/5 lg:w-[15%] order-3 md:order-3 space-y-4">
            <Skeleton className="h-64 w-full rounded-md" /> <Skeleton className="h-40 w-full rounded-md" />
          </aside>
        </div>
        <div className="mt-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-md" /> <Skeleton className="h-24 w-full rounded-md" />
        </div>
      </div>
      <div className="container mx-auto px-4 mt-8"><Skeleton className="h-24 w-full mb-6 rounded-md" /></div>
      <Skeleton className="h-16 w-full mt-4 rounded-none" /> 
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {renderGadgetsForSection('header-logo-area', 'container mx-auto px-4 pt-4')}
      <Header onSearch={handleSearch} />
      {renderGadgetsForSection('below-header', 'container mx-auto px-4 pt-4')}

      <main className="flex-grow container mx-auto px-4 py-8">
        {isPageLoading ? (<PageSkeleton />) : (
          <>
            {renderGadgetsForSection('homepage-top', 'mb-8')}
            <div className="flex flex-col md:flex-row gap-8">
              <aside className="w-full md:w-1/5 lg:w-[15%] order-2 md:order-1 space-y-6">
                {renderGadgetsForSection('sidebar-left')}
                {activeGadgets['sidebar-left']?.length === 0 && (
                  <Card className="p-4 bg-muted/30 hidden md:block">
                     <CardHeader className="p-0 pb-2"><CardTitle className="text-sm text-muted-foreground">Left Area</CardTitle></CardHeader>
                     <CardContent className="p-0"><p className="text-xs text-muted-foreground">No gadgets.</p></CardContent>
                  </Card>
                )}
              </aside>
              <div className="w-full md:w-3/5 lg:w-[70%] order-1 md:order-2">
                <CategoryFilter categories={allNewsCategories} selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} />
                {filteredArticles.length > 0 ? (
                  <NewsList 
                    articles={filteredArticles} 
                    interstitialGadgets={activeGadgets['homepage-article-interstitial']} 
                    adsAfterEvery={2} // Ad after every 2 articles
                  />
                ) : (
                  <p className="text-center text-muted-foreground mt-16 text-xl">{getUIText("noArticlesFound")}</p>
                )}
              </div>
              <aside className="w-full md:w-1/5 lg:w-[15%] order-3 md:order-3 space-y-6">
                {renderGadgetsForSection('sidebar-right')}
                 {activeGadgets['sidebar-right']?.length === 0 && (
                   <Card className="p-4 bg-muted/30 hidden md:block">
                     <CardHeader className="p-0 pb-2"><CardTitle className="text-sm text-muted-foreground">Right Area</CardTitle></CardHeader>
                     <CardContent className="p-0"><p className="text-xs text-muted-foreground">No gadgets.</p></CardContent>
                   </Card>
                )}
              </aside>
            </div>
            <div className="mt-8">{renderGadgetsForSection('homepage-content-bottom')}</div>
          </>
        )}
      </main>
      {renderGadgetsForSection('footer', 'container mx-auto px-4 pt-8 pb-4')}
      <Footer />
    </div>
  );
}

