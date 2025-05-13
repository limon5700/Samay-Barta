
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

  const elements: React.ReactNode[] = [];
  let adCycleIndex = 0;

  articles.forEach((article, index) => {
    elements.push(<NewsCard key={article.id} article={article} />);

    if (interstitialGadgets && interstitialGadgets.length > 0 && (index + 1) % adsAfterEvery === 0 && (index + 1) < articles.length) {
      const gadgetToDisplay = interstitialGadgets[adCycleIndex % interstitialGadgets.length];
      elements.push(
        <div key={`interstitial-ad-${article.id}-${gadgetToDisplay.id}`} className="interstitial-ad-item my-4">
          <AdDisplay gadget={gadgetToDisplay} />
        </div>
      );
      adCycleIndex++;
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {elements.map((element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </div>
  );
}
