
"use server";

import { redirect } from "next/navigation";
import { getUserByUsername, getUserById, getPermissionsForUser, getRoleById } from "@/lib/data";
import type { UserSession, Permission } from "@/lib/types";

// Note: loginAction, logoutAction, and getSession are effectively disabled
// as per the request to remove session handling and authentication.

const checkLoginRequiredEnvVars = (): { success: boolean; error?: string } => {
  const MONGODB_URI_SET = !!process.env.MONGODB_URI;
  const ADMIN_USERNAME_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_SET = !!process.env.ADMIN_PASSWORD;

  console.log(`checkLoginRequiredEnvVars: MONGODB_URI is ${MONGODB_URI_SET ? "SET" : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${ADMIN_PASSWORD_SET ? "SET (Is Set: true)" : "NOT SET"}`);

  if (!MONGODB_URI_SET) {
    console.error("CRITICAL FOR LOGIN (but login disabled): MONGODB_URI is NOT SET in process.env at runtime. Database operations will fail.");
    return { success: false, error: "Server configuration error (DB_CONNECT_LOGIN_CHECK). Please contact administrator."};
  }
  // These are no longer strictly required for login as login is bypassed, but kept for general server health check.
  // if (!ADMIN_USERNAME_SET) {
  //   console.error("CRITICAL FOR LOGIN: ADMIN_USERNAME is NOT SET in process.env at runtime. .env admin login will fail.");
  //    return { success: false, error: "Server admin username not configured. Contact administrator. (Error Code: ENV_ADMIN_USER_MISSING_LOGIN)" };
  // }
  // if (!ADMIN_PASSWORD_SET) {
  //   console.error("CRITICAL FOR LOGIN: ADMIN_PASSWORD is NOT SET in process.env at runtime. .env admin login will fail.");
  //   return { success: false, error: "Server admin password not configured. Contact administrator. (Error Code: ENV_ADMIN_PASS_MISSING_LOGIN)" };
  // }
  return { success: true };
};

const checkRequiredEnvVars = (): { success: boolean; error?: string } => {
  const MONGODB_URI_SET = !!process.env.MONGODB_URI;
  // ADMIN_USERNAME and ADMIN_PASSWORD checks are less critical if auth is disabled
  // const ADMIN_USERNAME_SET = !!process.env.ADMIN_USERNAME;
  // const ADMIN_PASSWORD_SET = !!process.env.ADMIN_PASSWORD;
  const GEMINI_API_KEY_SET = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;
  
  if (!MONGODB_URI_SET) return { success: false, error: "MONGODB_URI is not configured on the server. (Error Code: GENERAL_DB_MISSING)"};
  // if (!ADMIN_USERNAME_SET) return { success: false, error: "ADMIN_USERNAME is not configured on the server. (Error Code: GENERAL_ADMIN_USER_MISSING)"};
  // if (!ADMIN_PASSWORD_SET) return { success: false, error: "ADMIN_PASSWORD is not configured on the server. (Error Code: GENERAL_ADMIN_PASS_MISSING)"};
  
  if (!GEMINI_API_KEY_SET) {
    console.warn("WARNING (General Check): GEMINI_API_KEY (or GOOGLE_API_KEY) is NOT SET in process.env at runtime. AI features may fail.");
  }
  return { success: true }; 
};


export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked, but authentication is bypassed. Redirecting to dashboard.");
  // Bypassing all authentication logic.
  // In a real scenario with auth, this would validate credentials.
  // For now, per request, we assume direct access after "login" attempt.
  return { success: true, redirectPath: "/admin/dashboard" };
}

export async function logoutAction() {
  'use server';
  console.log("logoutAction: Invoked, but no session to clear as authentication is bypassed. Redirecting to admin root.");
  // No session cookie to delete.
  redirect("/admin/dashboard"); // Or redirect to a public page if admin is no longer distinct
}

export async function getSession(): Promise<UserSession | null> {
  'use server';
  console.log("getSession: Invoked, but returning a mock SuperAdmin session as authentication is bypassed.");
  // Since authentication is bypassed, we can return a mock session object
  // that grants all permissions, as if a SuperAdmin is always logged in.
  // This is for development/testing purposes as requested.
  // Ensure general env vars are checked for other functionalities.
  // checkRequiredEnvVars(); // Can be called if needed for non-auth reasons

  const allPermissions: Permission[] = [
      'manage_articles', 'publish_articles', 'manage_users', 'manage_roles',
      'manage_layout_gadgets', 'manage_seo_global', 'manage_settings', 'view_admin_dashboard'
  ];
  return {
      username: "bypassed_super_admin", // Mock username
      roles: ["SuperAdmin (Bypassed)"],
      permissions: allPermissions,
      isEnvAdmin: true, // Mocking as env admin
      isAuthenticated: true, // Always authenticated
  };
}

export async function checkServerVarsAction(): Promise<Record<string, string | boolean>> {
    "use server";
    console.log("checkServerVarsAction: Invoked from client.");
    const vars = {
        MONGODB_URI_IS_SET: !!process.env.MONGODB_URI,
        ADMIN_USERNAME_IS_SET: !!process.env.ADMIN_USERNAME, // Still useful to check if set, even if not used for login
        ADMIN_USERNAME_VALUE: process.env.ADMIN_USERNAME || "NOT SET (Not used for login)",
        ADMIN_PASSWORD_IS_SET: !!process.env.ADMIN_PASSWORD, // Still useful to check if set
        GEMINI_API_KEY_IS_SET: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY,
        NODE_ENV: process.env.NODE_ENV || "NOT SET",
        VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET (Likely local or not on Vercel)",
    };
    console.log("checkServerVarsAction: Current server environment variables status:", vars);
    return vars;
}
