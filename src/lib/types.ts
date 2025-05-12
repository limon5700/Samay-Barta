
export interface NewsArticle {
  id: string; // This will be MongoDB's _id.toHexString()
  title: string;
  content: string; // Full content for summarizer
  excerpt: string; // Short excerpt for display
  category: Category;
  publishedDate: string; // ISO string format e.g. "2023-10-26T10:00:00Z"
  imageUrl?: string;
  dataAiHint?: string; // For picsum placeholder images
}

export type Category = "Technology" | "Sports" | "Business" | "World" | "Entertainment" | string; // Allow string for flexibility if categories are dynamic

export type AdPlacement = 
  | 'homepage-top' 
  | 'article-top' 
  | 'article-bottom'
  | 'article-inline' // Placeholder for future, complex implementation
  | 'popup' // Placeholder for future, complex implementation
  | 'native'; // Placeholder for future, complex implementation

export type AdType = 'custom' | 'external'; // 'custom' for image/link, 'external' for code snippet

export interface Advertisement {
  id: string; // MongoDB's _id.toHexString()
  placement: AdPlacement;
  adType: AdType;
  imageUrl?: string; // Required if adType is 'custom'
  linkUrl?: string; // Required if adType is 'custom'
  altText?: string;
  codeSnippet?: string; // Required if adType is 'external'
  isActive: boolean;
  createdAt?: string; // ISO string format
}

export type CreateAdvertisementData = Omit<Advertisement, 'id' | 'createdAt'>;
