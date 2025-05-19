
'use server';

import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import type { UserSession, LoginFormData } from '@/lib/types';
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';

// Helper function to check critical environment variables needed for login
async function checkLoginRequiredEnvVars(): Promise<{ error?: string }> {
  console.log("checkLoginRequiredEnvVars: Checking server environment variables...");
  const MONGODB_URI_IS_SET = !!process.env.MONGODB_URI;
  const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_IS_SET = !!process.env.ADMIN_PASSWORD;

  console.log(`checkLoginRequiredEnvVars: MONGODB_URI is ${MONGODB_URI_IS_SET ? "SET" : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_IS_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${ADMIN_PASSWORD_IS_SET ? "SET" : "NOT SET"}`);
  
  if (!MONGODB_URI_IS_SET || !ADMIN_USERNAME_IS_SET || !ADMIN_PASSWORD_IS_SET) {
    let missingVars = [];
    if (!MONGODB_URI_IS_SET) missingVars.push("MONGODB_URI");
    if (!ADMIN_USERNAME_IS_SET) missingVars.push("ADMIN_USERNAME");
    if (!ADMIN_PASSWORD_IS_SET) missingVars.push("ADMIN_PASSWORD");
    const errorMsg = `Server configuration error: The following critical environment variables are not set: ${missingVars.join(", ")}. Please set them in your .env file or Vercel environment variables.`;
    console.error(`checkLoginRequiredEnvVars: ${errorMsg}`);
    return { error: errorMsg };
  }
  return {};
}

export async function loginAction(formData: LoginFormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked. ABOUT TO CHECK LOGIN ENV VARS.");
  const envCheckResult = await checkLoginRequiredEnvVars();
  if (envCheckResult.error) {
    return { success: false, error: envCheckResult.error };
  }

  const { username, password } = formData;
  console.log(`loginAction: Attempting login for username: '${username}'`);

  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;
  const cookieStore = await nextCookies();

  try {
    // Check against .env admin credentials
    if (username === currentRuntimeAdminUsername) {
      if (password === currentRuntimeAdminPassword) {
        console.log("loginAction: Admin login via .env credentials SUCCESSFUL for username:", currentRuntimeAdminUsername);
        await cookieStore.set(SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days for superadmin
        });
        console.log(`loginAction: Cookie for ${SUPERADMIN_COOKIE_VALUE} should be set.`);
        // For Server Actions, redirect() throws NEXT_REDIRECT which is handled by Next.js
        // No explicit return after redirect() is typically needed.
        redirect('/admin/dashboard');
      } else {
        console.log("loginAction: Admin login via .env credentials FAILED - password mismatch for username:", currentRuntimeAdminUsername);
        return { success: false, error: "Invalid admin username or password." };
      }
    }

    // If we reach here, .env admin check failed or username didn't match
    console.log("loginAction: Username did not match .env admin or password was incorrect. No database user check implemented in this version.");
    return { success: false, error: "Invalid username or password." };

  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      console.log("loginAction: Caught NEXT_REDIRECT, re-throwing.");
      throw error; // Re-throw NEXT_REDIRECT to be handled by Next.js
    }
    console.error("loginAction: UNEXPECTED CRITICAL ERROR during login:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `An unexpected server error occurred during login. Please check server logs. Details: ${errorMessage}` };
  }
}

export async function logoutAction() {
  console.log("logoutAction: Attempting to logout.");
  const cookieStore = await nextCookies();
  await cookieStore.delete(SESSION_COOKIE_NAME);
  console.log("logoutAction: Session cookie deleted.");
  redirect('/admin/login');
}

// Simplified getSession for middleware (checks only superadmin cookie)
export async function getSession(): Promise<UserSession | null> {
  console.log("getSession: Invoked.");
  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
    // Basic check to ensure server is still configured for this superadmin
    if (process.env.ADMIN_USERNAME) {
        console.log("getSession: Valid 'superadmin_env_session' cookie found and ADMIN_USERNAME is set on server. Granting SuperAdmin access.");
        return {
            username: process.env.ADMIN_USERNAME,
            roles: ["SuperAdmin (ENV)"],
            permissions: [ // SuperAdmin has all permissions
                'manage_articles', 'publish_articles', 'manage_users', 'manage_roles',
                'manage_layout_gadgets', 'manage_seo_global', 'manage_settings', 'view_admin_dashboard'
            ],
            isEnvAdmin: true,
            isAuthenticated: true,
        };
    } else {
        console.warn("getSession: 'superadmin_env_session' cookie found, but ADMIN_USERNAME is NOT SET on server. Invalidating session.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
  }
  
  if (sessionCookieValue) {
    // If a cookie exists but it's not the superadmin one, it's treated as invalid in this simplified setup.
    // In a full system, this is where you'd parse user ID and check DB.
    console.log(`getSession: Found a session cookie ('${sessionCookieValue}'), but it's not the recognized SUPERADMIN_COOKIE_VALUE. Treating as invalid.`);
    await cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  console.log(`getSession: No valid session cookie found for ${SESSION_COOKIE_NAME}.`);
  return null;
}

export async function checkServerVarsAction(): Promise<Record<string, string | boolean>> {
    "use server";
    console.log("checkServerVarsAction: Invoked from client.");
    const vars = {
        MONGODB_URI_IS_SET: !!process.env.MONGODB_URI,
        ADMIN_USERNAME_IS_SET: !!process.env.ADMIN_USERNAME,
        ADMIN_USERNAME_VALUE: process.env.ADMIN_USERNAME || "NOT SET (Auth Disabled or issue)",
        ADMIN_PASSWORD_IS_SET: !!process.env.ADMIN_PASSWORD,
        GEMINI_API_KEY_IS_SET: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY,
        NODE_ENV: process.env.NODE_ENV || "NOT SET",
        VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET (Likely local or not on Vercel)",
    };
    console.log("checkServerVarsAction: Current server environment variables status:", vars);
    return vars;
}
