
'use server';

import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { LoginFormData } from '@/lib/types';
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';
// User/Role database functions are removed as User Role system is removed.
// import { getUserByUsername, User } from '@/lib/data';
// import bcrypt from 'bcryptjs'; // bcrypt would be needed if storing hashed passwords for DB users

// Helper function to check critical environment variables needed for .env admin login
async function checkLoginRequiredEnvVars(): Promise<{ error?: string }> {
  console.log("checkLoginRequiredEnvVars: Checking server environment variables for .env admin login...");
  const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_IS_SET = !!process.env.ADMIN_PASSWORD;

  console.log(`checkLoginRequiredEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_IS_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${ADMIN_PASSWORD_IS_SET ? "SET (Is Set: true)" : "NOT SET (Is Set: false)"}`);
  
  let missingVars = [];
  if (!ADMIN_USERNAME_IS_SET) missingVars.push("ADMIN_USERNAME");
  if (!ADMIN_PASSWORD_IS_SET) missingVars.push("ADMIN_PASSWORD");
  
  if (missingVars.length > 0) {
    const errorMsg = `Server configuration error for admin login: The following critical environment variables are not set: ${missingVars.join(", ")}. Please set them in your .env file or Vercel environment variables. Login cannot proceed.`;
    console.error(`checkLoginRequiredEnvVars: ${errorMsg}`);
    return { error: errorMsg };
  }
  return {};
}

export async function loginAction(formData: LoginFormData): Promise<{ success: boolean; error?: string }> {
  console.log("loginAction: Invoked. ABOUT TO CHECK LOGIN ENV VARS.");
  const envCheckResult = await checkLoginRequiredEnvVars();
  if (envCheckResult.error) {
    // This error will be caught by the login page and displayed
    return { success: false, error: envCheckResult.error };
  }

  const { username, password } = formData;
  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? "SET" : "NOT SET"}`);
  console.log(`loginAction: Attempting login for username: '${username}'`);

  try {
    if (username === currentRuntimeAdminUsername && password === currentRuntimeAdminPassword) {
      console.log("loginAction: Admin login via .env credentials SUCCESSFUL for username:", currentRuntimeAdminUsername);
      const cookieStore = await nextCookies();
      console.log(`loginAction: About to set cookie '${SESSION_COOKIE_NAME}' to '${SUPERADMIN_COOKIE_VALUE}'`);
      await cookieStore.set(SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
      console.log(`loginAction: Cookie for ${SUPERADMIN_COOKIE_VALUE} should be set. Attempting redirect to /admin/dashboard.`);
      redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
    } else {
      // This path handles cases where:
      // 1. Username doesn't match .env admin username.
      // 2. Username matches, but password for .env admin is incorrect.
      console.log("loginAction: .env admin credentials did not match or username was not the .env admin username.");
      // Since User Role system is removed, there are no other users to check against.
      return { success: false, error: "Invalid username or password." };
    }
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      console.log("loginAction: Caught NEXT_REDIRECT, re-throwing.");
      throw error; // Re-throw NEXT_REDIRECT to be handled by Next.js
    }
    console.error("loginAction: UNEXPECTED CRITICAL ERROR during login:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `An unexpected server error occurred during login. Details: ${errorMessage}` };
  }
}

export async function logoutAction() {
  console.log("logoutAction: Attempting to logout.");
  try {
    const cookieStore = await nextCookies();
    await cookieStore.delete(SESSION_COOKIE_NAME);
    console.log("logoutAction: Session cookie deleted.");
  } catch (error) {
    console.error("logoutAction: Error deleting cookie:", error);
  }
  redirect('/admin/login');
}

// getSession is simplified and primarily for the middleware to quickly check SuperAdmin.
// It's not used by AdminLayout for rendering nav links anymore.
export async function getSession(): Promise<{ isAuthenticated: boolean; isSuperAdmin?: boolean } | null> {
  console.log("getSession: Invoked (simplified for middleware or specific page checks).");
  
  // Check server configuration for .env admin.
  const serverAdminUsername = process.env.ADMIN_USERNAME;
  if (!serverAdminUsername) {
      console.warn("getSession: CRITICAL SERVER MISCONFIGURATION - ADMIN_USERNAME is not set on the server. Cannot validate SuperAdmin session.");
      return null; // Cannot validate any session if server isn't configured for superadmin
  }

  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;
  
  console.log(`getSession: Value of sessionCookie '${SESSION_COOKIE_NAME}' upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);

  if (!sessionCookieValue) {
    const allCookies = await cookieStore.getAll();
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME}. DEBUG - All cookies present:`, JSON.stringify(allCookies));
    return null;
  }

  if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
    // This is the SuperAdmin logged in via .env credentials.
    // A quick sanity check that the server still has ADMIN_USERNAME configured.
    if (process.env.ADMIN_USERNAME) {
        console.log("getSession: Valid SUPERADMIN_COOKIE_VALUE found and server ADMIN_USERNAME is set. User is SuperAdmin.");
        return {
            isAuthenticated: true,
            isSuperAdmin: true,
        };
    } else {
        // This case should ideally not happen if the check at the start of getSession passes.
        // But it's a failsafe: if the cookie is superadmin, but server lost its config, invalidate.
        console.warn("getSession: SUPERADMIN_COOKIE_VALUE found, but server ADMIN_USERNAME is now missing. Invalidating session.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
  }
  
  // Since User Role system is removed, there are no other session types (like database user sessions) to validate.
  console.log(`getSession: Cookie value '${sessionCookieValue}' is not '${SUPERADMIN_COOKIE_VALUE}'. No other session types handled. Invalidating.`);
  await cookieStore.delete(SESSION_COOKIE_NAME); // Clear any unrecognized cookie
  return null;
}


export async function checkServerVarsAction(): Promise<Record<string, string | boolean>> {
    "use server";
    console.log("checkServerVarsAction: Invoked from client.");
    const MONGODB_URI_IS_SET = !!process.env.MONGODB_URI;
    const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD_IS_SET = !!process.env.ADMIN_PASSWORD;
    const GEMINI_API_KEY_IS_SET = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;

    const vars = {
        MONGODB_URI_IS_SET,
        ADMIN_USERNAME_IS_SET,
        ADMIN_USERNAME_VALUE: process.env.ADMIN_USERNAME || "NOT SET (Auth Disabled or issue)",
        ADMIN_PASSWORD_IS_SET,
        GEMINI_API_KEY_IS_SET,
        NODE_ENV: process.env.NODE_ENV || "NOT SET",
        VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET (Likely local or not on Vercel)",
    };
    console.log("checkServerVarsAction: Current server environment variables status:", vars);
    return vars;
}
