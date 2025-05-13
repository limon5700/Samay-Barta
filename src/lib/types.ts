

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
  authorId?: string; // ID of the user who created/updated the article

  // SEO Fields
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[]; // Comma-separated in form, array in DB
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string; // URL to an Open Graph image
  canonicalUrl?: string;

  // Article-specific social links
  articleYoutubeUrl?: string;
  articleFacebookUrl?: string;
  articleMoreLinksUrl?: string; // A generic "more" link related to the article
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

// Ensure category is always provided when creating a new article
export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'> & { category: Category };


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

  // Global footer social links
  footerYoutubeUrl?: string;
  footerFacebookUrl?: string;
  footerMoreLinksUrl?: string;
}

export type CreateSeoSettingsData = Omit<SeoSettings, 'id' | 'updatedAt'>;

// --- User Role System Types ---
export type Permission = 
  | 'manage_articles' // Create, edit, delete any article
  | 'publish_articles' // Approve and publish articles
  | 'manage_users'     // Add, edit, delete users, assign roles
  | 'manage_roles'     // Define and modify roles and their permissions
  | 'manage_layout_gadgets' // Edit site layout and add/remove gadgets
  | 'manage_seo_global' // Access and modify global SEO settings
  | 'manage_settings'   // Manage site-wide settings (broader than SEO)
  | 'view_admin_dashboard'; // Basic access to view the admin dashboard

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export type CreateRoleData = Omit<Role, 'id' | 'createdAt' | 'updatedAt'>;

export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string; // Store hashed passwords
  roles: string[]; // Array of Role IDs
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateUserData = Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'> & {
  password?: string; // Password field for creation/update forms
};

export interface UserSession {
  userId?: string;
  username: string;
  roles: string[]; // Role names or IDs
  permissions: Permission[];
  isEnvAdmin: boolean; // True if logged in via .env credentials
  isAuthenticated: boolean;
}

// --- Analytics Types ---
export interface PeriodStats {
  today: number;
  yesterday?: number;
  thisWeek?: number;
  thisMonth?: number;
  lastMonth?: number;
  thisYear?: number;
}

export interface UserActivity {
  userId: string;
  username: string;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
}

export interface DashboardAnalytics {
  totalArticles: number;
  articlesToday: number;
  totalUsers: number;
  activeGadgets: number;
  visitorStats?: { // Optional as it requires separate tracking
    today: number;
    activeNow?: number; // e.g. last 15 mins
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  userPostActivity?: UserActivity[]; // Top active users or specific user stats
}

