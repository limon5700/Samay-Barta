

export interface NewsArticle {
  id: string; // This will be MongoDB's _id.toHexString()
  title: string;
  content: string; // Full content for summarizer
  excerpt: string; // Short excerpt for display
  category: Category;
  publishedDate: string; // ISO string format e.g. "2023-10-26T10:00:00Z"
  imageUrl?: string;
  dataAiHint?: string; // For picsum placeholder images
  inlineAdSnippets?: string[]; // For AdSense/Adsterra snippets within content
}

export type Category = "Technology" | "Sports" | "Business" | "World" | "Entertainment" | string; // Allow string for flexibility if categories are dynamic

export type AdPlacement =
  | 'homepage-top'
  | 'article-top'
  | 'article-bottom'
  | 'sidebar-left' // New
  | 'sidebar-right' // New
  | 'footer' // New
  | 'article-inline'; // Represents ads placed within article content body

export type AdType = 'custom' | 'external'; // 'custom' for image/link, 'external' for code snippet

export interface Advertisement {
  id: string; // MongoDB's _id.toHexString()
  placement: AdPlacement;
  adType: AdType;
  articleId?: string; // Optional: Link ad specifically to one article ID
  imageUrl?: string; // Required if adType is 'custom'
  linkUrl?: string; // Required if adType is 'custom'
  altText?: string;
  codeSnippet?: string; // Required if adType is 'external'
  isActive: boolean;
  createdAt?: string; // ISO string format
}

// Type for creating new news articles (before ID and publishedDate are assigned)
export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'>;

// Type for creating new advertisements (before ID and createdAt are assigned)
export type CreateAdvertisementData = Omit<Advertisement, 'id' | 'createdAt'>;
