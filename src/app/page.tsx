
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsArticle, Category, Advertisement } from '@/lib/types';
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

export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [homepageTopAds, setHomepageTopAds] = useState<Advertisement[]>([]);
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
        // Fetch articles and ads concurrently
        const [fetchedArticles, fetchedTopAds] = await Promise.all([
          getAllNewsArticles(),
          getAdsByPlacement('homepage-top') // Fetch ads for the top placement
        ]);
        setArticles(fetchedArticles);
        setHomepageTopAds(fetchedTopAds); // Store fetched top ads
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Failed to load page content.", variant: "destructive" });
        setArticles([]); 
        setHomepageTopAds([]); // Set ads to empty on error
      } finally {
        setIsPageLoading(false);
      }
    };
    
    fetchData();
  }, [isClient, toast]);

  const filteredArticles = useMemo(() => {
    // Ensure articles is always an array before filtering
    const safeArticles = Array.isArray(articles) ? articles : [];
    return safeArticles
      .filter(article =>
        selectedCategory === 'All' || article.category === selectedCategory
      )
      .filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) || // Check if excerpt exists
        (typeof article.category === 'string' && article.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [articles, searchTerm, selectedCategory]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleSelectCategory = useCallback((category: Category | 'All') => {
    setSelectedCategory(category);
  }, []);

  const PageSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
      {/* Ad Skeleton */}
      <Skeleton className="h-24 md:h-32 w-full mb-6 rounded-md" />
      <div className="mb-8 flex flex-wrap gap-2 justify-center">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-md" />)}
      </div>
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

  // Select the first active ad for the top placement
  const topAdToDisplay = useMemo(() => homepageTopAds.find(ad => ad.isActive), [homepageTopAds]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Header onSearch={handleSearch} />
      <main className="flex-grow">
        {isPageLoading ? ( 
          <PageSkeleton />
        ) : (
          <div className="container mx-auto px-4 py-8">
            {/* Display the top ad if available */}
            {topAdToDisplay && <AdDisplay ad={topAdToDisplay} className="mb-6" />} 
            
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
            {/* Consider adding another AdDisplay here for a bottom placement */}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
