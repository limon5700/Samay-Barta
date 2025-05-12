
"use client";

import type { NewsArticle } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight } from "lucide-react"; // Removed Loader2 as translation state is removed
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
// Removed translateText import and related state/effects
// import { translateText } from "@/ai/flows/translate-text-flow";
// import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  const { getUIText, isClient } = useAppContext();
  // Removed translation state and effects
  // const [displayTitle, setDisplayTitle] = useState(article.title);
  // const [displayExcerpt, setDisplayExcerpt] = useState(article.excerpt);
  // const [isTranslating, setIsTranslating] = useState(false);
  // const [currentArticleId, setCurrentArticleId] = useState(article.id);

  // Removed translateContent function and associated useEffect hooks

  if (!isClient) {
     // SSR Fallback / Initial render
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
          <CardDescription className="text-sm text-foreground/80">{article.excerpt || ''}</CardDescription> {/* Ensure excerpt is displayed */}
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

  // Use original article data directly
  const displayTitle = article.title;
  const displayExcerpt = article.excerpt;
  const formattedDate = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy") : "N/A";
  const seeMoreText = getUIText("seeMore");

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out rounded-lg">
      {article.imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={article.imageUrl}
            alt={displayTitle} // Use original title for alt
            fill={true}
            style={{objectFit:"cover"}}
            data-ai-hint={article.dataAiHint || "news article"}
          />
        </div>
      )}
      <CardHeader>
        {/* Remove skeleton loading for title as it's always available */}
        <CardTitle className="text-xl leading-tight mb-1">{displayTitle}</CardTitle>
        <div className="flex items-center text-xs text-muted-foreground space-x-2">
          {/* Category name might need translation if dynamic, but typically it's fixed */}
          <Badge variant="secondary" className="text-xs">{article.category}</Badge>
           {/* Date formatting itself might need i18n for complex cases, but basic format is usually fine */}
          <div className="flex items-center">
            <CalendarDays className="mr-1 h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
         {/* Remove skeleton loading for excerpt as it's always available */}
        <CardDescription className="text-sm text-foreground/80">{displayExcerpt}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          variant="default"
          size="sm"
          className="w-full transition-transform duration-200 hover:scale-105"
          aria-label={`${seeMoreText} ${displayTitle}`}
          // Removed disabled state related to translation
        >
          <Link href={`/article/${article.id}`}>
             {/* Removed loader icon */}
            {seeMoreText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

