import type { NewsArticle } from "@/lib/types";
import NewsCard from "./NewsCard";

interface NewsListProps {
  articles: NewsArticle[];
}

export default function NewsList({ articles }: NewsListProps) {
  if (!articles || articles.length === 0) {
    return <p className="text-center text-muted-foreground mt-8">No news articles to display.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}
