
'use server';

import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { LoginFormData } from '@/lib/types'; // UserSession removed as getSession is simplified
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';

// Helper function to check critical environment variables needed for login
async function checkLoginRequiredEnvVars(): Promise<{ error?: string }> {
  console.log("checkLoginRequiredEnvVars: Checking server environment variables for login...");
  // MONGODB_URI check is removed as it's not strictly needed for .env admin login itself
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
    return { success: false, error: envCheckResult.error };
  }

  const { username, password } = formData;
  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? 'set' : 'NOT SET'}`);
  console.log(`loginAction: Attempting login for username: '${username}'`);

  try {
    if (username === currentRuntimeAdminUsername) {
      if (password === currentRuntimeAdminPassword) {
        console.log("loginAction: Admin login via .env credentials SUCCESSFUL for username:", currentRuntimeAdminUsername);
        const cookieStore = await nextCookies();
        console.log(`loginAction: About to set cookie '${SESSION_COOKIE_NAME}' to '${SUPERADMIN_COOKIE_VALUE}'`);
        await cookieStore.set(SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          // Session cookie (expires when browser closes)
        });
        console.log(`loginAction: Cookie for ${SUPERADMIN_COOKIE_VALUE} should be set. Attempting redirect to /admin/dashboard.`);
        redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
      } else {
        console.log("loginAction: Admin login via .env credentials FAILED - password mismatch for username:", currentRuntimeAdminUsername);
        return { success: false, error: "Invalid admin username or password." };
      }
    } else {
      console.log("loginAction: Username did not match .env admin. No other user types implemented.");
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
    // Still attempt to redirect
  }
  redirect('/admin/login');
}

// getSession is simplified and NOT called by AdminLayout or Middleware for the primary SuperAdmin auth flow.
// It's kept for potential future use if a specific page component needs to verify SuperAdmin status.
export async function getSession(): Promise<{ isAuthenticated: boolean; username?: string; isSuperAdmin?: boolean } | null> {
  console.log("getSession: Invoked (NOT part of primary SuperAdmin nav auth flow).");
  
  const serverAdminUsername = process.env.ADMIN_USERNAME;
  if (!serverAdminUsername) {
      console.warn("getSession: ADMIN_USERNAME is not set on the server. Cannot validate SuperAdmin session if called.");
      // No cookie deletion here, as the server itself is misconfigured for this check.
      return null;
  }

  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;
  
  console.log(`getSession: Value of sessionCookie?.value upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);

  if (!sessionCookieValue) {
    const allCookies = await cookieStore.getAll(); // Get all cookies from the NextRequest for logging
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME}. DEBUG - All cookies present when ${SESSION_COOKIE_NAME} was not found:`, JSON.stringify(allCookies));
    return null;
  }

  if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
    console.log("getSession: Found SUPERADMIN_COOKIE_VALUE. Server ADMIN_USERNAME is set. User is SuperAdmin.");
    return {
        isAuthenticated: true,
        username: serverAdminUsername,
        isSuperAdmin: true,
    };
  }
  
  console.log(`getSession: Cookie value '${sessionCookieValue}' is not SUPERADMIN_COOKIE_VALUE. No other session types handled by this simplified getSession.`);
  // If the cookie exists but is not the SUPERADMIN_COOKIE_VALUE, it's invalid for this simplified check.
  // We might not want to delete it if it's for another purpose, but for SuperAdmin auth, it's not valid.
  // For robustness, if a specific page calls getSession and gets a non-superadmin cookie, it should treat as unauth.
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
