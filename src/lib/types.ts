
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
  | 'homepage-content-bottom'
  | 'homepage-article-interstitial' // New section for ads between articles on homepage
  | 'article-top'
  | 'article-bottom'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'footer'
  | 'article-inline' 
  | 'header-logo-area'
  | 'below-header'
  ;

export interface Gadget {
  id: string; // MongoDB's _id.toHexString()
  section: LayoutSection; // The layout section where this gadget appears
  title?: string; // Optional title for the gadget in the admin UI
  content: string; // HTML/JavaScript content for the gadget (ad code, etc.)
  isActive: boolean;
  createdAt?: string; // ISO string format
  order?: number; // Optional: For ordering gadgets within a section
}

export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'>;

export type CreateGadgetData = Omit<Gadget, 'id' | 'createdAt'>;

// Placeholder for SEO Settings
export interface SeoSettings {
  id: string; // Typically a single document in a collection
  siteTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[]; // Array of keywords
  faviconUrl?: string;
  // Add other SEO related fields as needed
  updatedAt?: string;
}

export type CreateSeoSettingsData = Omit<SeoSettings, 'id' | 'updatedAt'>;
