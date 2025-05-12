
export interface NewsArticle {
  id: string; // This will be MongoDB's _id.toHexString()
  title: string;
  content: string; // Full content for summarizer
  excerpt: string; // Short excerpt for display
  category: Category;
  publishedDate: string; // ISO string format e.g. "2023-10-26T10:00:00Z"
  imageUrl?: string;
  dataAiHint?: string; // For picsum placeholder images
  inlineAdSnippets?: string[]; // For AdSense/Adsterra snippets within content, associated with [AD_INLINE] placeholders
}

export type Category = "Technology" | "Sports" | "Business" | "World" | "Entertainment" | string; // Allow string for flexibility if categories are dynamic

// Renamed AdPlacement to LayoutSection for clarity, matching Blogger's concept
export type LayoutSection =
  | 'homepage-top'
  | 'article-top'
  | 'article-bottom'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'footer'
  | 'article-inline' // This section might be used globally for default inline ads if not specified in article
  | 'header-logo-area' // Example new section if needed
  | 'below-header' // Example new section if needed
  ;

// Renamed Advertisement to Gadget, simplified for HTML/JS content
export interface Gadget {
  id: string; // MongoDB's _id.toHexString()
  section: LayoutSection; // The layout section where this gadget appears
  title?: string; // Optional title for the gadget in the admin UI
  content: string; // HTML/JavaScript content for the gadget (ad code, etc.)
  isActive: boolean;
  createdAt?: string; // ISO string format
  order?: number; // Optional: For ordering gadgets within a section
}

// Type for creating new news articles (before ID and publishedDate are assigned)
export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'>;

// Type for creating new gadgets (before ID and createdAt are assigned)
export type CreateGadgetData = Omit<Gadget, 'id' | 'createdAt'>;

// Keep original Advertisement type temporarily if needed during transition, but aim to remove it.
// export type AdType = 'custom' | 'external';
// export interface Advertisement { ... old structure ... }
// export type CreateAdvertisementData = Omit<Advertisement, 'id' | 'createdAt'>;
