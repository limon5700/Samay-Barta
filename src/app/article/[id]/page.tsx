
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';

import type { NewsArticle, Advertisement, AdPlacement } from '@/lib/types';
import { getArticleById, getAdsByPlacement } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdDisplay from '@/components/ads/AdDisplay';
import { translateText } from '@/ai/flows/translate-text-flow';
import { useToast } from "@/hooks/use-toast";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';

// Helper function to select a random ad from an array
const getRandomAd = (ads: Advertisement[]): Advertisement | null => {
  if (!ads || ads.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * ads.length);
  return ads[randomIndex];
};

// Helper function to render content with inline ads
const renderContentWithAds = (content: string, snippets: string[] = []): React.ReactNode[] => {
    const contentParts = content.split('[AD_INLINE]');
    const result: React.ReactNode[] = [];
    let snippetIndex = 0;

    contentParts.forEach((part, index) => {
        // Add text part, preserving whitespace
        result.push(<span key={`content-${index}`} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>);

        // Add ad snippet if available and not the last part
        if (index < contentParts.length - 1 && snippetIndex < snippets.length) {
            const snippet = snippets[snippetIndex];
            // Basic check if snippet looks like HTML/script
            const looksLikeHtml = snippet.trim().startsWith('<') && snippet.trim().endsWith('>');
            
            if (looksLikeHtml) {
                 result.push(
                    // Using AdDisplay ensures script execution logic is handled
                    <AdDisplay
                        key={`ad-${snippetIndex}`}
                        ad={{
                            // Construct a minimal Ad object for AdDisplay
                            adType: 'external',
                            codeSnippet: snippet,
                            isActive: true, // Assume active if it's in the article
                            placement: 'article-inline', // Generic placement type
                            id: `inline-${id}-${snippetIndex}` // Create a unique-ish key
                        }}
                        className="my-4"
                    />
                );
            } else {
                 // If it doesn't look like HTML, maybe just display as text (or log warning)
                 console.warn("Inline ad snippet doesn't look like HTML:", snippet);
                 // Optionally render as plain text or skip
                 // result.push(<pre key={`ad-${snippetIndex}`} className="my-4 text-xs bg-muted p-2 rounded">{snippet}</pre>);
            }
            snippetIndex++;
        }
    });
    return result;
};


export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { language, getUIText, isClient } = useAppContext();
  const id = params.id as string;

  const [article, setArticle] = useState<NewsArticle | null>(null);
  // State to hold the *selected* ad for each placement
  const [selectedAds, setSelectedAds] = useState<Record<AdPlacement, Advertisement | null>>({
      'homepage-top': null, // Keep all placements for type safety
      'article-top': null,
      'article-bottom': null,
      'sidebar-left': null,
      'sidebar-right': null,
      'footer': null,
      'article-inline': null, // This might not be used directly here
      'popup': null,
      'native': null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  const [displayTitle, setDisplayTitle] = useState<string>('');
  const [displayContent, setDisplayContent] = useState<string>('');

  const [translationsCache, setTranslationsCache] = useState<Record<string, { title: string, content: string }>>({});

  const fetchArticleAndAds = useCallback(async () => {
    if (!id || !isClient) return;
    setIsLoading(true);
    try {
      const foundArticle = await getArticleById(id);

      if (foundArticle) {
        setArticle(foundArticle);
        // Fetch ads for all relevant placements for THIS article
        const placementsToFetch: AdPlacement[] = [
          'article-top',
          'article-bottom',
          'sidebar-left',
          'sidebar-right',
          'footer'
        ];
        const adFetchPromises = placementsToFetch.map(placement => getAdsByPlacement(placement, id));
        const adsByPlacementArrays = await Promise.all(adFetchPromises);

        const newSelectedAds: Record<AdPlacement, Advertisement | null> = { ...selectedAds };
        placementsToFetch.forEach((placement, index) => {
          newSelectedAds[placement] = getRandomAd(adsByPlacementArrays[index]);
        });
        setSelectedAds(newSelectedAds);

      } else {
        toast({ title: getUIText("error") || "Error", description: getUIText("articleNotFound"), variant: "destructive" });
        // router.push('/'); // Consider if redirect is always desired
      }
    } catch (error) {
      console.error("Failed to fetch article or ads:", error);
      toast({ title: getUIText("error") || "Error", description: "Failed to load article details or ads.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isClient, toast, getUIText, router]); // selectedAds removed from deps

  useEffect(() => {
    fetchArticleAndAds();
  }, [fetchArticleAndAds]);


  const performTranslation = useCallback(async () => {
    if (!article || !language || !isClient) return;

    if (language === 'en') {
      setDisplayTitle(article.title);
      setDisplayContent(article.content);
      return;
    }

    if (translationsCache[language]) {
      setDisplayTitle(translationsCache[language].title);
      setDisplayContent(translationsCache[language].content);
      return;
    }

    setIsTranslating(true);
    try {
      const [titleResult, contentResult] = await Promise.all([
        translateText({ text: article.title, targetLanguage: language }),
        translateText({ text: article.content, targetLanguage: language })
      ]);

      const newTitle = titleResult.translatedText;
      const newContent = contentResult.translatedText;

      setDisplayTitle(newTitle);
      setDisplayContent(newContent);

      setTranslationsCache(prev => ({ ...prev, [language]: { title: newTitle, content: newContent } }));

    } catch (error) {
      console.error("Error translating article:", error);
      toast({
        title: getUIText("translationFailed"),
        description: getUIText("couldNotTranslateArticle"),
        variant: "destructive",
      });
      setDisplayTitle(article.title);
      setDisplayContent(article.content);
    } finally {
      setIsTranslating(false);
    }
  }, [article, language, toast, getUIText, isClient, translationsCache]);

  useEffect(() => {
    if (article && isClient) {
      performTranslation();
    } else if (article && !isClient) {
        setDisplayTitle(article.title);
        setDisplayContent(article.content);
    }
  }, [article, language, isClient, performTranslation]);


  // --- Memoized Ad Components ---
  const TopAdComponent = useMemo(() => selectedAds['article-top'] ? <AdDisplay ad={selectedAds['article-top']} className="mb-6" /> : null, [selectedAds]);
  const BottomAdComponent = useMemo(() => selectedAds['article-bottom'] ? <AdDisplay ad={selectedAds['article-bottom']} className="mt-6" /> : null, [selectedAds]);
  const SidebarLeftAdComponent = useMemo(() => selectedAds['sidebar-left'] ? <AdDisplay ad={selectedAds['sidebar-left']} className="mb-4" /> : null, [selectedAds]);
  const SidebarRightAdComponent = useMemo(() => selectedAds['sidebar-right'] ? <AdDisplay ad={selectedAds['sidebar-right']} className="mb-4" /> : null, [selectedAds]);
  const FooterAdComponent = useMemo(() => selectedAds['footer'] ? <AdDisplay ad={selectedAds['footer']} className="mt-6 container mx-auto px-4" /> : null, [selectedAds]);

  // --- Render Logic ---

   if (!isClient && !id) {
     // Minimal SSR if no ID yet
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="text-3xl font-bold text-primary animate-pulse bg-muted-foreground/20 h-9 w-48 rounded-md"></div>
                 <div className="w-10 h-10 animate-pulse bg-muted-foreground/20 rounded-md" />
            </div>
        </header>
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
         <Footer /> {/* Keep Footer for basic structure */}
      </div>
    );
  }

  if (isLoading) { // Loading state skeleton
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header onSearch={(term) => router.push(`/?search=${term}`)} />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Sidebar Skeleton */}
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first">
              <Skeleton className="h-48 w-full mb-4 rounded-md" />
              <Skeleton className="h-32 w-full rounded-md" />
            </aside>

            {/* Main Content Skeleton */}
            <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
                <Skeleton className="h-8 w-24 mb-6 rounded-md" />
                <Skeleton className="h-20 w-full mb-6 rounded-md" />
                <Card className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-10 w-3/4 mb-2 rounded-md" />
                    <Skeleton className="h-40 w-full rounded-md mb-4 sm:h-64 md:h-96" />
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-6 w-32 rounded-md" />
                    </div>
                </CardHeader>
                <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert">
                    <Skeleton className="h-6 w-full mb-2 rounded-md" />
                    <Skeleton className="h-6 w-full mb-2 rounded-md" />
                    <Skeleton className="h-6 w-5/6 mb-2 rounded-md" />
                    {/* Inline Ad Skeleton */}
                    <Skeleton className="h-16 w-full my-4 rounded-md" />
                    <Skeleton className="h-6 w-full mb-2 rounded-md" />
                     <Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
                </CardContent>
                </Card>
                <Skeleton className="h-20 w-full mt-6 rounded-md" />
            </div>

            {/* Right Sidebar Skeleton */}
             <aside className="w-full md:w-1/4 lg:w-1/5 order-last">
                <Skeleton className="h-64 w-full mb-4 rounded-md" />
                <Skeleton className="h-40 w-full rounded-md" />
            </aside>
          </div>
        </main>
        {/* Footer Ad Skeleton */}
        <Skeleton className="h-16 w-full mt-6 rounded-md container mx-auto px-4 mb-4" />
        <Footer />
      </div>
    );
  }

  if (!article && !isLoading) { // Article not found state
    return (
       <div className="flex flex-col min-h-screen bg-background">
        <Header onSearch={(term) => router.push(`/?search=${term}`)} />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-2xl text-muted-foreground">{getUIText("articleNotFound")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Ensure article exists for rendering
  if (!article) return null;

  const formattedDate = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy 'at' h:mm a") : "N/A";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header onSearch={(term) => router.push(`/?search=${term}`)} />
      <main className="flex-grow container mx-auto px-4 py-8">
         <div className="flex flex-col md:flex-row gap-8">
             {/* Left Sidebar */}
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-6">
                {SidebarLeftAdComponent}
                {/* You can add other sidebar content here if needed */}
                 <Card className="p-4 bg-muted/30">
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Left Sidebar</h3>
                    <p className="text-xs text-muted-foreground">Additional content or ads can go here.</p>
                 </Card>
            </aside>

             {/* Main Content Area */}
             <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
                 <Button variant="outline" onClick={() => router.back()} className="mb-6 group">
                  <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  {getUIText("backToNews")}
                </Button>

                {/* Top Ad Placement */}
                {TopAdComponent}

                <Card className="shadow-xl rounded-xl overflow-hidden">
                  {article.imageUrl && (
                    <div className="relative w-full h-64 md:h-96">
                      <Image
                        src={article.imageUrl}
                        alt={isTranslating && !displayTitle ? (getUIText("loading") || "Loading...") : displayTitle || article.title}
                        fill={true}
                        style={{objectFit:"cover"}}
                        priority
                        data-ai-hint={article.dataAiHint || "news article detail"}
                      />
                    </div>
                  )}
                  <CardHeader className="p-6">
                    {isTranslating && !displayTitle ? (
                        <Skeleton className="h-10 w-3/4 mb-3 rounded-md" />
                    ) : (
                        <CardTitle className="text-3xl md:text-4xl font-bold leading-tight mb-3 text-primary">
                        {displayTitle || article.title}
                        </CardTitle>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                      <Badge variant="secondary" className="text-md px-3 py-1">{article.category}</Badge>
                      <span>{isClient ? getUIText("publishedDateLabel") || "Published" : "Published"}: {formattedDate}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    {isTranslating && !displayContent ? (
                        <>
                            <Skeleton className="h-6 w-full mb-2 rounded-md" />
                            <Skeleton className="h-6 w-full mb-2 rounded-md" />
                            <Skeleton className="h-6 w-5/6 mb-2 rounded-md" />
                        </>
                    ) : (
                        <article className="prose prose-base sm:prose-lg lg:prose-xl max-w-none dark:prose-invert text-foreground/90 leading-relaxed">
                           {/* Render content potentially including inline ads */}
                           {renderContentWithAds(displayContent || article.content, article.inlineAdSnippets)}
                        </article>
                    )}
                  </CardContent>
                </Card>
                {isTranslating && (
                    <div className="mt-8 text-center flex items-center justify-center text-primary">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        <span>{getUIText("translating")}</span>
                    </div>
                )}

                {/* Bottom Ad Placement */}
                {BottomAdComponent}
             </div>

              {/* Right Sidebar */}
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-6">
                 {SidebarRightAdComponent}
                {/* You can add other sidebar content here if needed */}
                 <Card className="p-4 bg-muted/30">
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Right Sidebar</h3>
                     <p className="text-xs text-muted-foreground">Additional content or ads can go here.</p>
                 </Card>
            </aside>
         </div>
      </main>
       {/* Footer Ad Placement */}
       {FooterAdComponent}
      <Footer />
    </div>
  );
}

// Add missing import for React
// Add missing import for useMemo
// Ensure id is defined for inline ad key (using article id)
