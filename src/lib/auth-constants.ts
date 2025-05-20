
export const SESSION_COOKIE_NAME = "admin-auth-token";
// This specific value will identify the SuperAdmin session originating from .env credentials.
export const SUPERADMIN_COOKIE_VALUE = "superadmin_env_session";

// Permissions are not used in this simplified setup as user roles are removed
// export type Permission =
//   | 'manage_articles'
//   | 'publish_articles'
//   | 'manage_users'
//   | 'manage_roles'
//   | 'manage_layout_gadgets'
//   | 'manage_seo_global'
//   | 'manage_settings'
//   | 'view_admin_dashboard';
