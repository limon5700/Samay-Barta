
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
  authorId?: string; // Can be .env admin or a DB user ID

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

// User Role System Types
export type Permission =
  | 'manage_articles' // Create, update, delete articles
  | 'publish_articles' // Publish/unpublish articles
  | 'manage_users' // Create, update, delete users
  | 'manage_roles' // Create, update, delete roles and assign permissions
  | 'manage_layout_gadgets' // Manage layout gadgets (ads, etc.)
  | 'manage_seo_global' // Manage global SEO settings
  | 'manage_settings' // Manage other site-wide settings
  | 'view_admin_dashboard'; // Basic permission to view the dashboard

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
}
export type CreateRoleData = Omit<Role, 'id' | 'createdAt' | 'updatedAt'>;

export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string; // Hashed password
  roles: string[]; // Array of role IDs
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export type CreateUserData = Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'> & { password?: string };
export type UpdateUserData = Partial<CreateUserData> & { roles?: string[], isActive?: boolean };


export interface UserSession {
  isAuthenticated: boolean;
  userId?: string;
  username?: string;
  roles?: string[]; // Role names or IDs
  permissions?: Permission[];
  isSuperAdmin?: boolean; // True if logged in via .env credentials
}

export interface LoginFormData {
  username: string;
  password?: string;
}

// Analytics Types
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
  postCount: number;
  lastPostDate?: string;
}

export interface DashboardAnalytics {
  totalArticles: number;
  articlesToday: number;
  totalUsers: number;
  activeGadgets: number;
  visitorStats?: { 
    today: number;
    activeNow?: number; 
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  userPostActivity?: UserActivity[];
}

export interface ActivityLogEntry {
  id: string;
  userId: string; // Can be 'SUPERADMIN_ENV' or a user ID from DB
  username: string; // Username of the actor
  action: string; // e.g., 'article_created', 'user_updated', 'role_deleted'
  targetType?: string; // e.g., 'article', 'user', 'role'
  targetId?: string; // ID of the entity that was acted upon
  details?: Record<string, any>; // Additional JSON details about the action
  timestamp: string;
}

export type CreateActivityLogData = Omit<ActivityLogEntry, 'id' | 'timestamp'>;

