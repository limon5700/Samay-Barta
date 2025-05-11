
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsArticle, Category } from '@/lib/types';
import { getAllNewsArticles } from '@/lib/data';
import { categories as allNewsCategories } from '@/lib/constants';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsList from '@/components/news/NewsList';
import CategoryFilter from '@/components/news/CategoryFilter';
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { getUIText, isClient } = useAppContext();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchArticles = async () => {
      if (!isClient) return; // Ensure this runs only on client after hydration
      setIsPageLoading(true);
      try {
        const fetchedArticles = await getAllNewsArticles();
        setArticles(fetchedArticles);
      } catch (error) {
        console.error("Failed to fetch articles:", error);
        toast({ title: "Error", description: "Failed to load news articles.", variant: "destructive" });
        setArticles([]); // Set to empty on error
      } finally {
        setIsPageLoading(false);
      }
    };
    
    fetchArticles();
  }, [isClient, toast]);

  const filteredArticles = useMemo(() => {
    return articles
      .filter(article =>
        selectedCategory === 'All' || article.category === selectedCategory
      )
      .filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (typeof article.category === 'string' && article.category.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      // Sorting is now handled by the database query in getAllNewsArticles (by publishedDate desc)
      // If client-side sort is still desired for some reason, it can be added back:
      // .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  }, [articles, searchTerm, selectedCategory]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleSelectCategory = useCallback((category: Category | 'All') => {
    setSelectedCategory(category);
  }, []);

  const PageSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
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


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Header onSearch={handleSearch} />
      <main className="flex-grow">
        {isPageLoading ? ( 
          <PageSkeleton />
        ) : (
          <div className="container mx-auto px-4 py-8">
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
        )}
      </main>
      <Footer />
    </div>
  );
}
