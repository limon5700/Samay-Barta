
"use client";

import type { NewsArticle } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { translateText } from "@/ai/flows/translate-text-flow";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  const { getUIText, language, isClient } = useAppContext();
  const [displayTitle, setDisplayTitle] = useState(article.title);
  const [displayExcerpt, setDisplayExcerpt] = useState(article.excerpt);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [currentArticleId, setCurrentArticleId] = useState(article.id);


  const translateContent = useCallback(async (title: string, excerpt: string, targetLang: string) => {
    if (targetLang === 'en') { // Assuming 'en' is the original language of the content
      setDisplayTitle(article.title);
      setDisplayExcerpt(article.excerpt);
      return;
    }
    setIsTranslating(true);
    try {
      const [translatedTitleResult, translatedExcerptResult] = await Promise.all([
        translateText({ text: title, targetLanguage: targetLang }),
        translateText({ text: excerpt, targetLanguage: targetLang }),
      ]);
      setDisplayTitle(translatedTitleResult.translatedText);
      setDisplayExcerpt(translatedExcerptResult.translatedText);
    } catch (error) {
      console.error("Error translating card content:", error);
      // Fallback to original content on error
      setDisplayTitle(article.title);
      setDisplayExcerpt(article.excerpt);
    } finally {
      setIsTranslating(false);
    }
  }, [article.title, article.excerpt]);

  useEffect(() => {
    // Reset content if article changes
    if (article.id !== currentArticleId) {
        setDisplayTitle(article.title);
        setDisplayExcerpt(article.excerpt);
        setCurrentArticleId(article.id);
        if (isClient && language !== 'en') { // Retranslate if new article and not English
            translateContent(article.title, article.excerpt, language);
        }
    } else if (isClient) { // If same article, but language might have changed
        translateContent(article.title, article.excerpt, language);
    }
  }, [language, article, isClient, translateContent, currentArticleId]);


  if (!isClient) {
     // SSR Fallback / Initial render before client-side effects
    const formattedDateSsr = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy") : "N/A";
    return (
      <Card className="flex flex-col h-full overflow-hidden shadow-lg rounded-lg">
        {article.imageUrl && (
          <div className="relative w-full h-48">
            <Image
              src={article.imageUrl}
              alt={article.title} // Original title for alt
              fill={true}
              style={{objectFit:"cover"}}
              data-ai-hint={article.dataAiHint || "news article"}
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl leading-tight mb-1">{article.title}</CardTitle>
           <div className="flex items-center text-xs text-muted-foreground space-x-2">
            <Badge variant="secondary" className="text-xs">{article.category}</Badge>
            <div className="flex items-center">
                <CalendarDays className="mr-1 h-3 w-3" />
                <span>{formattedDateSsr}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardDescription className="text-sm text-foreground/80">{article.excerpt}</CardDescription>
        </CardContent>
        <CardFooter>
          <Button asChild variant="default" size="sm" className="w-full" disabled>
            <span className="flex items-center">
              Loading... <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </Button>
        </CardFooter>
      </Card>
    );
  }


  const formattedDate = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy") : "N/A";
  const seeMoreText = getUIText("seeMore");

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out rounded-lg">
      {article.imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={article.imageUrl}
            alt={displayTitle} // Use translated title for alt if available
            fill={true}
            style={{objectFit:"cover"}}
            data-ai-hint={article.dataAiHint || "news article"}
          />
        </div>
      )}
      <CardHeader>
        {isTranslating && !displayTitle ? (
            <Skeleton className="h-6 w-3/4 mb-1" />
        ) : (
            <CardTitle className="text-xl leading-tight mb-1">{displayTitle}</CardTitle>
        )}
        <div className="flex items-center text-xs text-muted-foreground space-x-2">
          <Badge variant="secondary" className="text-xs">{article.category}</Badge> {/* Category name might need translation if dynamic */}
          <div className="flex items-center">
            <CalendarDays className="mr-1 h-3 w-3" />
            <span>{formattedDate}</span> {/* Date formatting itself might need i18n for complex cases */}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
         {isTranslating && !displayExcerpt ? (
            <>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6 mb-1" />
            </>
        ) : (
            <CardDescription className="text-sm text-foreground/80">{displayExcerpt}</CardDescription>
        )}
        
      </CardContent>
      <CardFooter>
        <Button
          asChild
          variant="default"
          size="sm"
          className="w-full transition-transform duration-200 hover:scale-105"
          aria-label={`${seeMoreText} ${displayTitle}`}
          disabled={isTranslating}
        >
          <Link href={`/article/${article.id}`}>
            {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : seeMoreText}
            {!isTranslating && <ArrowRight className="ml-2 h-4 w-4" />}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
