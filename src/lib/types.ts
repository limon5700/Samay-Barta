
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

export interface Advertisement {
  id: string; // MongoDB's _id.toHexString()
  imageUrl: string;
  linkUrl: string;
  altText?: string;
  isActive: boolean;
  createdAt?: string; // ISO string format
}

export type CreateAdvertisementData = Omit<Advertisement, 'id' | 'createdAt'>;
