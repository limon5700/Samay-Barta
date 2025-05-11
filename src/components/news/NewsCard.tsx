"use client";

import type { NewsArticle } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  const formattedDate = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy") : "N/A";

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out rounded-lg">
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
            <span>{formattedDate}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="text-sm text-foreground/80">{article.excerpt}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          variant="default"
          size="sm"
          className="w-full transition-transform duration-200 hover:scale-105"
          aria-label={`Read more about ${article.title}`}
        >
          <Link href={`/article/${article.id}`}>
            See More
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
