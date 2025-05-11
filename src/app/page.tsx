
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsArticle, Category } from '@/lib/types';
import { sampleNewsArticles, categories as allNewsCategories } from '@/lib/data';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsList from '@/components/news/NewsList';
import CategoryFilter from '@/components/news/CategoryFilter';
import SummarizerModal from '@/components/news/SummarizerModal';
import { summarizeNewsArticle } from '@/ai/flows/summarize-news-article';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

export default function HomePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [isPageLoading, setIsPageLoading] = useState(true);

  // For Summarizer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [articleToSummarize, setArticleToSummarize] = useState<NewsArticle | null>(null);
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching data
    setIsPageLoading(true);
    setTimeout(() => { // Simulate network delay
      setArticles(sampleNewsArticles);
      setIsPageLoading(false);
    }, 1000);
  }, []);

  const filteredArticles = useMemo(() => {
    return articles
      .filter(article =>
        selectedCategory === 'All' || article.category === selectedCategory
      )
      .filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) || // Search excerpt too
        article.category.toLowerCase().includes(searchTerm.toLowerCase()) 
      )
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  }, [articles, searchTerm, selectedCategory]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleSelectCategory = useCallback((category: Category | 'All') => {
    setSelectedCategory(category);
  }, []);

  const handleSummarize = useCallback(async (article: NewsArticle) => {
    setArticleToSummarize(article);
    setIsModalOpen(true);
    setIsLoadingSummary(true);
    setSummary('');
    setSummaryError('');
    try {
      const result = await summarizeNewsArticle({ articleContent: article.content });
      setSummary(result.summary);
      toast({
        title: "Summary Generated",
        description: `AI summary for "${article.title}" is ready.`,
      });
    } catch (error) {
      console.error("Error summarizing article:", error);
      setSummaryError("Failed to summarize the article. Please try again.");
      toast({
        title: "Summarization Failed",
        description: "Could not generate AI summary. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSummary(false);
    }
  }, [toast]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Wait for modal to close before resetting, avoids flash of old content
    setTimeout(() => {
      setArticleToSummarize(null);
      setSummary('');
      setSummaryError('');
    }, 300);
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
      <Header appName="সময় বার্তা Lite" onSearch={handleSearch} />
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
              <NewsList articles={filteredArticles} onSummarize={handleSummarize} />
            ) : (
              <p className="text-center text-muted-foreground mt-16 text-xl">
                No news articles found matching your criteria.
              </p>
            )}
          </div>
        )}
      </main>
      <Footer />
      {articleToSummarize && ( // Ensure modal is only rendered when an article is selected
        <SummarizerModal
          isOpen={isModalOpen}
          onClose={closeModal}
          articleTitle={articleToSummarize.title}
          summary={summary}
          isLoading={isLoadingSummary}
          error={summaryError}
        />
      )}
    </div>
  );
}
