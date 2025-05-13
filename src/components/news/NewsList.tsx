
import type { NewsArticle, Gadget } from "@/lib/types";
import NewsCard from "./NewsCard";
import AdDisplay from "@/components/ads/AdDisplay";
import React from "react";

interface NewsListProps {
  articles: NewsArticle[];
  interstitialGadgets?: Gadget[];
  adsAfterEvery?: number; // e.g., 2 for an ad after every 2 articles
}

export default function NewsList({ articles, interstitialGadgets, adsAfterEvery = 2 }: NewsListProps) {
  if (!articles || articles.length === 0) {
    return <p className="text-center text-muted-foreground mt-8">No news articles to display.</p>;
  }

  const itemsToRender: { type: 'article' | 'ad'; data: NewsArticle | Gadget; id: string }[] = [];
  let adCycleIndex = 0;

  articles.forEach((article, index) => {
    itemsToRender.push({ type: 'article', data: article, id: article.id });

    // Insert ad after every `adsAfterEvery` articles.
    // The condition `(index + 1) % adsAfterEvery === 0` ensures ad insertion at the specified interval.
    // The condition `(index + 1) < articles.length` prevents an ad from being placed after the absolute final article if it's also the end of an "adsAfterEvery" block.
    if (interstitialGadgets && interstitialGadgets.length > 0 && (index + 1) % adsAfterEvery === 0 && (index + 1) < articles.length) {
      const gadgetToDisplay = interstitialGadgets[adCycleIndex % interstitialGadgets.length];
      itemsToRender.push({ type: 'ad', data: gadgetToDisplay, id: `interstitial-ad-${article.id}-${gadgetToDisplay.id}` });
      adCycleIndex++;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Ensures 3 columns on large screens and up */}
      {itemsToRender.map((item) => {
        if (item.type === 'article') {
          // NewsCard will naturally fit into one column of the grid
          return <NewsCard key={item.id} article={item.data as NewsArticle} />;
        }
        if (item.type === 'ad') {
          // Ad container spans full width of the grid at all breakpoints
          // For a 3-column layout, col-span-3 makes it full width. For sm: 2-cols, col-span-2. For default 1-col, col-span-1.
          return (
            <div key={item.id} className="col-span-1 sm:col-span-2 lg:col-span-3 my-4 interstitial-ad-item">
              <AdDisplay gadget={item.data as Gadget} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

