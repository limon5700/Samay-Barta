
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';

import type { NewsArticle, Gadget, LayoutSection } from '@/lib/types'; // Use Gadget, LayoutSection
import { getArticleById, getActiveGadgetsBySection } from '@/lib/data'; // Use getActiveGadgetsBySection
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdDisplay from '@/components/ads/AdDisplay'; // AdDisplay handles Gadgets
import { translateText } from '@/ai/flows/translate-text-flow';
import { useToast } from "@/hooks/use-toast";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';

// Helper function to render content with inline ads using article's specific snippets
const renderContentWithAds = (content: string, inlineSnippets: string[] = [], articleId: string): React.ReactNode[] => {
    const contentParts = content.split('[AD_INLINE]');
    const result: React.ReactNode[] = [];
    let snippetIndex = 0;

    contentParts.forEach((part, index) => {
        // Add text part, preserving whitespace
        result.push(<span key={`content-${index}`} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>);

        // Add ad snippet if available and not the last part
        if (index < contentParts.length - 1 && snippetIndex < inlineSnippets.length) {
            const snippet = inlineSnippets[snippetIndex];
            // Basic check if snippet looks like HTML/script
            const looksLikeHtml = snippet.trim().startsWith('<') && snippet.trim().endsWith('>');

            if (looksLikeHtml) {
                 result.push(
                    // Using AdDisplay ensures script execution logic is handled
                    <AdDisplay
                        key={`ad-${articleId}-${snippetIndex}`} // Use article ID in key
                        gadget={{
                            // Construct a minimal Gadget object for AdDisplay
                            content: snippet,
                            isActive: true, // Assume active if it's in the article
                            section: 'article-inline', // Generic section type for inline
                            id: `inline-${articleId}-${snippetIndex}` // Create a unique-ish key
                        }}
                        className="my-4 inline-ad-widget" // Add specific class for inline ads
                    />
                );
            } else {
                 // If it doesn't look like HTML, maybe just display as text (or log warning)
                 console.warn("Inline ad snippet doesn't look like HTML:", snippet);
                 // Optionally render as plain text or skip
                 // result.push(<pre key={`ad-${articleId}-${snippetIndex}`} className="my-4 text-xs bg-muted p-2 rounded">{snippet}</pre>);
            }
            snippetIndex++;
        } else if (index < contentParts.length - 1) {
            // If placeholder exists but no more snippets, maybe render default inline ad gadget?
            // This part requires fetching the 'article-inline' gadget section too.
            // For now, just leave the placeholder spot empty if snippets run out.
            // console.log("Placeholder [AD_INLINE] found, but no more snippets available.");
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
  // State to hold *all* active gadgets for each relevant placement
  const [activeGadgets, setActiveGadgets] = useState<Record<LayoutSection, Gadget[]>>({
      'homepage-top': [], // Keep all sections for type safety, though not all used here
      'article-top': [],
      'article-bottom': [],
      'sidebar-left': [],
      'sidebar-right': [],
      'footer': [],
      'article-inline': [], // Added to fetch potential default inline ads
      'header-logo-area': [],
      'below-header': [],
      // Add other sections if needed
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  const [displayTitle, setDisplayTitle] = useState<string>('');
  const [displayContent, setDisplayContent] = useState<string>('');

  const [translationsCache, setTranslationsCache] = useState<Record<string, { title: string, content: string }>>({});

  const fetchArticleAndGadgets = useCallback(async () => {
    if (!id || !isClient) return;
    setIsLoading(true);
    try {
      const foundArticle = await getArticleById(id);

      if (foundArticle) {
        setArticle(foundArticle);
        // Fetch gadgets for all relevant placements for THIS article page
        const sectionsToFetch: LayoutSection[] = [
          'article-top',
          'article-bottom',
          'sidebar-left',
          'sidebar-right',
          'footer',
          'article-inline', // Fetch default inline ads too
          'header-logo-area', // Fetch header ads if needed
          'below-header', // Fetch below-header ads if needed
        ];
        const gadgetFetchPromises = sectionsToFetch.map(section =>
             getActiveGadgetsBySection(section) // No articleId needed for gadgets
         );
        const gadgetsBySectionArrays = await Promise.all(gadgetFetchPromises);

        const newActiveGadgets: Record<LayoutSection, Gadget[]> = { ...activeGadgets };
        sectionsToFetch.forEach((section, index) => {
          newActiveGadgets[section] = gadgetsBySectionArrays[index] || [];
        });
        setActiveGadgets(newActiveGadgets);

      } else {
        toast({ title: getUIText("error") || "Error", description: getUIText("articleNotFound"), variant: "destructive" });
        // Optionally redirect: router.push('/');
      }
    } catch (error) {
      console.error("Failed to fetch article or gadgets:", error);
      toast({ title: getUIText("error") || "Error", description: "Failed to load article details or ads.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isClient, toast, getUIText, router]); // Dependencies

  useEffect(() => {
    fetchArticleAndGadgets();
  }, [fetchArticleAndGadgets]);


  const performTranslation = useCallback(async () => {
    if (!article || !language || !isClient) return;

    // Use English as the baseline, no translation needed
    if (language === 'en') {
      setDisplayTitle(article.title);
      setDisplayContent(article.content);
      return;
    }

    // Use cached translation if available
    if (translationsCache[language]) {
      setDisplayTitle(translationsCache[language].title);
      setDisplayContent(translationsCache[language].content);
      return;
    }

    // Perform translation
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

      // Cache the new translation
      setTranslationsCache(prev => ({ ...prev, [language]: { title: newTitle, content: newContent } }));

    } catch (error) {
      console.error("Error translating article:", error);
      toast({
        title: getUIText("translationFailed"),
        description: getUIText("couldNotTranslateArticle"),
        variant: "destructive",
      });
      // Fallback to original content on error
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
        // Set initial display content for SSR or non-JS users
        setDisplayTitle(article.title);
        setDisplayContent(article.content);
    }
  }, [article, language, isClient, performTranslation]);


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

  // --- Render Logic ---

   if (!isClient && !id) {
     // Minimal SSR skeleton if no ID yet
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
         <Footer />
      </div>
    );
  }

  if (isLoading) { // Loading state skeleton
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {renderGadgetsForSection('header-logo-area', 'container mx-auto px-4 pt-4')}
        <Header onSearch={(term) => router.push(`/?search=${term}`)} />
        {renderGadgetsForSection('below-header', 'container mx-auto px-4 pt-4')}
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Sidebar Skeleton */}
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-4">
              <Skeleton className="h-48 w-full mb-4 rounded-md" />
              <Skeleton className="h-32 w-full rounded-md" />
            </aside>

            {/* Main Content Skeleton */}
            <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
                <Skeleton className="h-8 w-24 mb-6 rounded-md" />
                 {/* Article Top Ad Skeleton */}
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
                {/* Article Bottom Ad Skeleton */}
                <Skeleton className="h-20 w-full mt-6 rounded-md" />
            </div>

            {/* Right Sidebar Skeleton */}
             <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-4">
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
         {renderGadgetsForSection('header-logo-area', 'container mx-auto px-4 pt-4')}
        <Header onSearch={(term) => router.push(`/?search=${term}`)} />
         {renderGadgetsForSection('below-header', 'container mx-auto px-4 pt-4')}
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-2xl text-muted-foreground">{getUIText("articleNotFound")}</p>
        </main>
         {renderGadgetsForSection('footer', 'container mx-auto px-4 pt-4')}
        <Footer />
      </div>
    );
  }

  // Ensure article exists for rendering
  if (!article) return null;

  const formattedDate = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy 'at' h:mm a") : "N/A";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {renderGadgetsForSection('header-logo-area', 'container mx-auto px-4 pt-4')}
      <Header onSearch={(term) => router.push(`/?search=${term}`)} />
      {renderGadgetsForSection('below-header', 'container mx-auto px-4 pt-4')}
      <main className="flex-grow container mx-auto px-4 py-8">
         <div className="flex flex-col md:flex-row gap-8">
             {/* Left Sidebar */}
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-6">
                {/* Render all gadgets for sidebar-left */}
                {renderGadgetsForSection('sidebar-left')}
                 {/* Placeholder for other sidebar content */}
                 {activeGadgets['sidebar-left']?.length === 0 && (
                    <Card className="p-4 bg-muted/30">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Left Sidebar</h3>
                        <p className="text-xs text-muted-foreground">Additional content.</p>
                    </Card>
                 )}
            </aside>

             {/* Main Content Area */}
             <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A">
                 <Button variant="outline" onClick={() => router.back()} className="mb-6 group">
                  <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  {getUIText("backToNews")}
                </Button>

                {/* Article Top Gadget Area */}
                {renderGadgetsForSection('article-top', 'mb-6')}

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
                           {/* Render content including inline ads from article snippets */}
                           {renderContentWithAds(displayContent || article.content, article.inlineAdSnippets, article.id)}
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

                {/* Article Bottom Gadget Area */}
                {renderGadgetsForSection('article-bottom', 'mt-6')}
             </div>

              {/* Right Sidebar */}
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-6">
                 {/* Render all gadgets for sidebar-right */}
                 {renderGadgetsForSection('sidebar-right')}
                 {/* Placeholder for other sidebar content */}
                 {activeGadgets['sidebar-right']?.length === 0 && (
                    <Card className="p-4 bg-muted/30">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Right Sidebar</h3>
                        <p className="text-xs text-muted-foreground">Additional content.</p>
                    </Card>
                 )}
            </aside>
         </div>
      </main>
       {/* Footer Gadget Placement */}
       {renderGadgetsForSection('footer', 'container mx-auto px-4 pt-4')}
      <Footer />
    </div>
  );
}
