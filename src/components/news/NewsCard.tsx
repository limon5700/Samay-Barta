
"use client";

import type { NewsArticle } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { bn } from 'date-fns/locale'; // Import Bengali locale
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  const { getUIText, isClient, language: currentLocale } = useAppContext();

  if (!isClient) {
    let formattedDateSsr = "N/A";
    try {
      if (article.publishedDate) {
        formattedDateSsr = formatDistanceToNow(parseISO(article.publishedDate), { addSuffix: true, locale: currentLocale === 'bn' ? bn : undefined });
      }
    } catch (e) {
      // If parsing fails, fallback to simple display or N/A
      try {
         if (article.publishedDate) {
            formattedDateSsr = new Date(article.publishedDate).toLocaleDateString();
         }
      } catch (parseError) {
        console.warn("Error parsing date for SSR in NewsCard:", parseError)
      }
    }

    return (
      <Card className="flex flex-col h-full overflow-hidden shadow-lg rounded-lg">
        {article.imageUrl && (
          <div className="relative w-full h-48">
            <Image
              src={article.imageUrl}
              alt={article.title}
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
          <CardDescription className="text-sm text-foreground/80">{article.excerpt || ''}</CardDescription>
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

  const displayTitle = article.title;
  const displayExcerpt = article.excerpt;
  
  let relativeDate = "N/A";
  try {
    if (article.publishedDate) {
      relativeDate = formatDistanceToNow(parseISO(article.publishedDate), { addSuffix: true, locale: currentLocale === 'bn' ? bn : undefined });
    }
  } catch (e) {
    console.warn("Error formatting relative date in NewsCard:", e);
     try {
         if (article.publishedDate) {
            relativeDate = new Date(article.publishedDate).toLocaleDateString();
         }
      } catch (parseError) {
         console.warn("Error parsing date for fallback in NewsCard:", parseError)
      }
  }
  
  const seeMoreText = getUIText("seeMore");

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out rounded-lg">
      {article.imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={article.imageUrl}
            alt={displayTitle}
            fill={true}
            style={{objectFit:"cover"}}
            data-ai-hint={article.dataAiHint || "news article"}
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl leading-tight mb-1">{displayTitle}</CardTitle>
        <div className="flex items-center text-xs text-muted-foreground space-x-2">
          <Badge variant="secondary" className="text-xs">{article.category}</Badge>
          <div className="flex items-center">
            <CalendarDays className="mr-1 h-3 w-3" />
            <span>{relativeDate}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="text-sm text-foreground/80">{displayExcerpt}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          variant="default"
          size="sm"
          className="w-full transition-transform duration-200 hover:scale-105"
          aria-label={`${seeMoreText} ${displayTitle}`}
        >
          <Link href={`/article/${article.id}`}>
            {seeMoreText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
