
export interface NewsArticle {
  id: string; 
  title: string;
  content: string; 
  excerpt: string; 
  category: Category;
  publishedDate: string; 
  imageUrl?: string;
  dataAiHint?: string; 
  inlineAdSnippets?: string[]; 
  // authorId removed

  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[]; 
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string; 
  canonicalUrl?: string;

  articleYoutubeUrl?: string;
  articleFacebookUrl?: string;
  articleMoreLinksUrl?: string; 
}

export type Category = "Technology" | "Sports" | "Business" | "World" | "Entertainment" | string; 

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

export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'> & { category: Category };


export type CreateGadgetData = Omit<Gadget, 'id' | 'createdAt'>;

export interface SeoSettings {
  id: string; 
  siteTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[]; 
  faviconUrl?: string; 
  ogSiteName?: string;
  ogLocale?: string; 
  ogType?: string; 
  twitterCard?: string; 
  twitterSite?: string; 
  twitterCreator?: string; 
  updatedAt?: string;

  footerYoutubeUrl?: string;
  footerFacebookUrl?: string;
  footerMoreLinksUrl?: string;
}

export type CreateSeoSettingsData = Omit<SeoSettings, 'id' | 'updatedAt'>;

// User Role System Types (Permission, Role, CreateRoleData, User, CreateUserData, UserSession) are removed.

// Analytics Types
export interface PeriodStats {
  today: number;
  yesterday?: number;
  thisWeek?: number;
  thisMonth?: number;
  lastMonth?: number;
  thisYear?: number;
}

// UserActivity type removed

export interface DashboardAnalytics {
  totalArticles: number;
  articlesToday: number;
  // totalUsers removed
  activeGadgets: number;
  visitorStats?: { 
    today: number;
    activeNow?: number; 
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  // userPostActivity removed
}
