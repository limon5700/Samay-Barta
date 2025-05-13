
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone
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

const DHAKA_TIMEZONE = 'Asia/Dhaka';

// Helper function to render content with inline ads
const renderContentWithAds = (
  content: string,
  articleSpecificSnippets: string[] = [],
  defaultInlineGadgets: Gadget[] = [],
  articleId: string
): React.ReactNode[] => {
    const contentParts = content.split('[AD_INLINE]');
    const result: React.ReactNode[] = [];
    let snippetIndex = 0;
    let defaultGadgetIndex = 0;

    contentParts.forEach((part, index) => {
        result.push(<span key={`content-${articleId}-${index}`} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>);

        if (index < contentParts.length - 1) { // If there's an [AD_INLINE] placeholder
            let adRendered = false;
            // Prioritize article-specific snippets
            if (snippetIndex < articleSpecificSnippets.length) {
                const snippet = articleSpecificSnippets[snippetIndex];
                const looksLikeHtml = snippet.trim().startsWith('<') && snippet.trim().endsWith('>');
                if (looksLikeHtml) {
                    result.push(
                        <AdDisplay
                            key={`ad-specific-${articleId}-${snippetIndex}`}
                            gadget={{
                                content: snippet,
                                isActive: true,
                                section: 'article-inline',
                                id: `inline-specific-${articleId}-${snippetIndex}`
                            }}
                            className="my-4 inline-ad-widget"
                        />
                    );
                    adRendered = true;
                } else {
                     console.warn("Article specific inline ad snippet doesn't look like HTML:", snippet);
                }
                snippetIndex++;
            }

            // If no article-specific snippet was rendered for this placeholder, use a default inline gadget
            if (!adRendered && defaultGadgetIndex < defaultInlineGadgets.length) {
                const defaultGadget = defaultInlineGadgets[defaultGadgetIndex];
                result.push(
                    <AdDisplay
                        key={`ad-default-${articleId}-${defaultGadget.id}-${defaultGadgetIndex}`}
                        gadget={defaultGadget}
                        className="my-4 inline-ad-widget default-inline-ad"
                    />
                );
                defaultGadgetIndex++;
            } else if (!adRendered) {
                // console.log("Placeholder [AD_INLINE] found, but no more article-specific or default inline ads available for this spot.");
            }
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
      'homepage-top': [], 
      'article-top': [],
      'article-bottom': [],
      'sidebar-left': [],
      'sidebar-right': [],
      'footer': [],
      'article-inline': [], 
      'header-logo-area': [],
      'below-header': [],
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
        const sectionsToFetch: LayoutSection[] = [
          'article-top',
          'article-bottom',
          'sidebar-left',
          'sidebar-right',
          'footer',
          'article-inline', 
          'header-logo-area', 
          'below-header', 
        ];
        const gadgetFetchPromises = sectionsToFetch.map(section =>
             getActiveGadgetsBySection(section)
         );
        const gadgetsBySectionArrays = await Promise.all(gadgetFetchPromises);

        const newActiveGadgetsState: Partial<Record<LayoutSection, Gadget[]>> = {};
        sectionsToFetch.forEach((section, index) => {
          newActiveGadgetsState[section] = gadgetsBySectionArrays[index] || [];
        });
        setActiveGadgets(prev => ({...prev, ...newActiveGadgetsState}));

      } else {
        toast({ title: getUIText("error") || "Error", description: getUIText("articleNotFound"), variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch article or gadgets:", error);
      toast({ title: getUIText("error") || "Error", description: "Failed to load article details or ads.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isClient, toast, getUIText]); 

  useEffect(() => {
    fetchArticleAndGadgets();
  }, [fetchArticleAndGadgets]);


  const performTranslation = useCallback(async () => {
    if (!article || !language || !isClient) return;

    if (language === 'en') { // Assuming 'en' is the original language or a baseline
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
        description: getUIText("couldNotTranslateArticle") + (error instanceof Error ? ` ${error.message}` : ''),
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


  const renderGadgetsForSection = (section: LayoutSection, className?: string) => {
    const gadgets = activeGadgets[section] || [];
    if (gadgets.length === 0) return null;
    return (
      <div className={`section-gadgets section-${section}-container ${className || ''}`}>
        {gadgets.map((gadget) => (
          <AdDisplay key={gadget.id} gadget={gadget} className="mb-4" /> 
        ))}
      </div>
    );
  };

   if (!isClient && !id) {
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

  if (isLoading) { 
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {renderGadgetsForSection('header-logo-area', 'container mx-auto px-4 pt-4')}
        <Header onSearch={(term) => router.push(`/?search=${term}`)} />
        {renderGadgetsForSection('below-header', 'container mx-auto px-4 pt-4')}
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-4">
              <Skeleton className="h-48 w-full mb-4 rounded-md" />
              <Skeleton className="h-32 w-full rounded-md" />
            </aside>

            <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order- A"> {/* Typo fixed here 'md:order- A' -> 'md:order-none' or appropriate class */}
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
                    <Skeleton className="h-16 w-full my-4 rounded-md" />
                    <Skeleton className="h-6 w-full mb-2 rounded-md" />
                     <Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
                </CardContent>
                </Card>
                <Skeleton className="h-20 w-full mt-6 rounded-md" />
            </div>

             <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-4">
                <Skeleton className="h-64 w-full mb-4 rounded-md" />
                <Skeleton className="h-40 w-full rounded-md" />
            </aside>
          </div>
        </main>
        <Skeleton className="h-16 w-full mt-6 rounded-md container mx-auto px-4 mb-4" />
        <Footer />
      </div>
    );
  }

  if (!article && !isLoading) { 
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

  if (!article) return null;

  const formattedDate = article.publishedDate ? formatInTimeZone(parseISO(article.publishedDate), DHAKA_TIMEZONE, "MMMM d, yyyy 'at' h:mm a zzz") : "N/A";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {renderGadgetsForSection('header-logo-area', 'container mx-auto px-4 pt-4')}
      <Header onSearch={(term) => router.push(`/?search=${term}`)} />
      {renderGadgetsForSection('below-header', 'container mx-auto px-4 pt-4')}
      <main className="flex-grow container mx-auto px-4 py-8">
         <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-1/4 lg:w-1/5 order-last md:order-first space-y-6">
                {renderGadgetsForSection('sidebar-left')}
                 {activeGadgets['sidebar-left']?.length === 0 && (
                    <Card className="p-4 bg-muted/30">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Left Sidebar</h3>
                        <p className="text-xs text-muted-foreground">Additional content.</p>
                    </Card>
                 )}
            </aside>

             <div className="w-full md:w-3/4 lg:w-3/5 order-first md:order-none"> {/* Corrected order class */}
                 <Button variant="outline" onClick={() => router.back()} className="mb-6 group">
                  <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  {getUIText("backToNews")}
                </Button>

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
                           {renderContentWithAds(
                                displayContent || article.content,
                                article.inlineAdSnippets,
                                activeGadgets['article-inline'],
                                article.id
                            )}
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

                {renderGadgetsForSection('article-bottom', 'mt-6')}
             </div>

            <aside className="w-full md:w-1/4 lg:w-1/5 order-last space-y-6">
                 {renderGadgetsForSection('sidebar-right')}
                 {activeGadgets['sidebar-right']?.length === 0 && (
                    <Card className="p-4 bg-muted/30">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Right Sidebar</h3>
                        <p className="text-xs text-muted-foreground">Additional content.</p>
                    </Card>
                 )}
            </aside>
         </div>
      </main>
       {renderGadgetsForSection('footer', 'container mx-auto px-4 pt-4')}
      <Footer />
    </div>
  );
}
