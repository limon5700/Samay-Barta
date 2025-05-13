
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

  // SEO Fields
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[]; // Comma-separated in form, array in DB
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string; // URL to an Open Graph image
  canonicalUrl?: string;
}

export type Category = "Technology" | "Sports" | "Business" | "World" | "Entertainment" | string; // Allow string for flexibility if categories are dynamic

export type LayoutSection =
  | 'homepage-top'
  | 'homepage-content-bottom'
  | 'homepage-article-interstitial'
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
  id: string; 
  section: LayoutSection; 
  title?: string; 
  content: string; 
  isActive: boolean;
  createdAt?: string; 
  order?: number; 
}

export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'>;

export type CreateGadgetData = Omit<Gadget, 'id' | 'createdAt'>;

export interface SeoSettings {
  id: string; // Fixed ID for the global settings document e.g. "global_seo_settings"
  siteTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[]; // Array of keywords
  faviconUrl?: string; // e.g., /favicon.ico
  ogSiteName?: string;
  ogLocale?: string; // e.g., en_US
  ogType?: string; // e.g., website
  twitterCard?: string; // e.g., summary_large_image
  twitterSite?: string; // e.g., @YourTwitterHandle
  twitterCreator?: string; // e.g., @AuthorTwitterHandle (if applicable as a default)
  updatedAt?: string;
}

export type CreateSeoSettingsData = Omit<SeoSettings, 'id' | 'updatedAt'>;
