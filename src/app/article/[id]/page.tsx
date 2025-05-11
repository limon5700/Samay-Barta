
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';

import type { NewsArticle } from '@/lib/types';
import { sampleNewsArticles } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { translateText } from '@/ai/flows/translate-text-flow';
import { useToast } from "@/hooks/use-toast";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { language, getUIText, isClient } = useAppContext();
  const id = params.id as string;

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [displayTitle, setDisplayTitle] = useState<string>('');
  const [displayContent, setDisplayContent] = useState<string>('');
  
  // Cache for translations to avoid re-fetching
  const [translationsCache, setTranslationsCache] = useState<Record<string, { title: string, content: string }>>({});


  useEffect(() => {
    if (id && isClient) { // Ensure isClient before fetching/setting article
      setIsLoading(true);
      // Simulate fetching article data
      setTimeout(() => {
        const foundArticle = sampleNewsArticles.find(art => art.id === id);
        if (foundArticle) {
          setArticle(foundArticle);
          // Set initial display content based on current language
          // This will be handled by the translation useEffect below
        } else {
          toast({ title: getUIText("error") || "Error", description: getUIText("articleNotFound"), variant: "destructive" });
          router.push('/'); 
        }
        setIsLoading(false);
      }, 500);
    } else if (!isClient && id) {
      // For SSR, find article but don't set display content yet (handled by skeleton)
      const foundArticle = sampleNewsArticles.find(art => art.id === id);
      setArticle(foundArticle); // Allow skeleton to use basic article info
      setIsLoading(false); // Consider if loading should be true until client hydration for translation
    }
  }, [id, router, toast, getUIText, isClient]);


  const performTranslation = useCallback(async () => {
    if (!article || !language || !isClient) return;

    // Assuming 'en' is the original language of the article content
    if (language === 'en') {
      setDisplayTitle(article.title);
      setDisplayContent(article.content);
      return;
    }

    // Check cache first
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
      
      setDisplayTitle(titleResult.translatedText);
      setDisplayContent(contentResult.translatedText);
      
      // Update cache
      setTranslationsCache(prev => ({ ...prev, [language]: { title: titleResult.translatedText, content: contentResult.translatedText } }));

      // toast({
      //   title: getUIText("translationSuccessful"),
      //   description: `${getUIText("articleTranslatedTo")} ${language}.`,
      // });
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
    if (article && isClient) { // Only run translation logic on client and if article exists
      performTranslation();
    } else if (article && !isClient) {
        // SSR: set initial display to original english
        setDisplayTitle(article.title);
        setDisplayContent(article.content);
    }
  }, [article, language, isClient, performTranslation]);


  if (!isClient && !article) { // Pure SSR, no article yet (should not happen if id is present)
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Minimal Header for SSR */}
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


  if (isLoading || (isClient && !article && id)) { // Loading on client, or client has id but article not fetched yet
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header onSearch={(term) => router.push(`/?search=${term}`)} />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-24 mb-6 rounded-md" />
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
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
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

  const formattedDate = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy 'at' h:mm a") : "N/A";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header onSearch={(term) => router.push(`/?search=${term}`)} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-6 group">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          {getUIText("backToNews")}
        </Button>

        <Card className="shadow-xl rounded-xl overflow-hidden">
          {article.imageUrl && (
            <div className="relative w-full h-64 md:h-96">
              <Image
                src={article.imageUrl}
                alt={isTranslating && !displayTitle ? (getUIText("loading") || "Loading...") : displayTitle}
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
                {displayTitle}
                </CardTitle>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
              <Badge variant="secondary" className="text-md px-3 py-1">{article.category}</Badge> {/* Category might need translation */}
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
                <article className="prose prose-base sm:prose-lg lg:prose-xl max-w-none dark:prose-invert text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {displayContent}
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
      </main>
      <Footer />
    </div>
  );
}
