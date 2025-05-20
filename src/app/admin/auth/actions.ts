
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
  console.log(`checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${ADMIN_PASSWORD_IS_SET ? "SET (Is Set: true)" : "NOT SET (Is Set: false)"}`);
  
  if (!MONGODB_URI_IS_SET || !ADMIN_USERNAME_IS_SET || !ADMIN_PASSWORD_IS_SET) {
    let missingVars = [];
    if (!MONGODB_URI_IS_SET) missingVars.push("MONGODB_URI");
    if (!ADMIN_USERNAME_IS_SET) missingVars.push("ADMIN_USERNAME");
    if (!ADMIN_PASSWORD_IS_SET) missingVars.push("ADMIN_PASSWORD");
    const errorMsg = `Server configuration error: The following critical environment variables are not set: ${missingVars.join(", ")}. Please set them in your .env file or Vercel environment variables. Login cannot proceed.`;
    console.error(`checkLoginRequiredEnvVars: ${errorMsg}`);
    return { error: errorMsg };
  }
  return {};
}

export async function loginAction(formData: LoginFormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked. ABOUT TO CHECK LOGIN ENV VARS.");
  const envCheckResult = await checkLoginRequiredEnvVars();
  if (envCheckResult.error) {
    // If critical env vars are missing, don't even attempt login.
    return { success: false, error: envCheckResult.error };
  }

  const { username, password } = formData;
  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? 'set' : 'NOT SET'}`);
  console.log(`loginAction: Attempting login for username: '${username}'`);

  const cookieStore = await nextCookies();

  try {
    // Check against .env admin credentials
    if (username === currentRuntimeAdminUsername) {
      if (password === currentRuntimeAdminPassword) {
        console.log("loginAction: Admin login via .env credentials SUCCESSFUL for username:", currentRuntimeAdminUsername);
        console.log(`loginAction: About to set cookie '${SESSION_COOKIE_NAME}' to '${SUPERADMIN_COOKIE_VALUE}'`);
        await cookieStore.set(SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          // Removed maxAge to make it a session cookie (expires when browser closes)
          // maxAge: 60 * 60 * 24 * 30, // 30 days for superadmin
        });
        console.log(`loginAction: Cookie for ${SUPERADMIN_COOKIE_VALUE} should be set. Attempting redirect to /admin/dashboard.`);
        redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
      } else {
        console.log("loginAction: Admin login via .env credentials FAILED - password mismatch for username:", currentRuntimeAdminUsername);
        return { success: false, error: "Invalid admin username or password." };
      }
    }

    // Fallback for database user check (currently not implemented for login, but structure is here)
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

// This getSession is primarily for middleware or server components if needed for fine-grained checks.
// AdminLayout will NOT use this.
export async function getSession(): Promise<UserSession | null> {
  console.log("getSession: Invoked. ABOUT TO CHECK ENV VARS in getSession.");
  const envCheckResult = await checkLoginRequiredEnvVars(); // Using login-specific check
  if (envCheckResult.error) {
    console.error("getSession: Critical environment variables missing, cannot reliably determine session state.", envCheckResult.error);
    return null; // Cannot validate session if server config is broken
  }

  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;
  
  console.log(`getSession: Value of sessionCookie?.value upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);

  if (!sessionCookieValue) {
    const allCookies = await cookieStore.getAll();
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME} (cookie does not exist or value is null/primitive undefined).`);
    console.log(`getSession: DEBUG - All cookies present when ${SESSION_COOKIE_NAME} was not found:`, JSON.stringify(allCookies));
    return null;
  }

  if (sessionCookieValue === 'undefined') { // Literal string 'undefined'
    console.warn(`CRITICAL_SESSION_ERROR: Session cookie ${SESSION_COOKIE_NAME} had literal string value 'undefined'. This indicates a serious problem. Clearing cookie.`);
    await cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
    const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;
    console.log(`getSession: For env_admin check - Runtime process.env.ADMIN_USERNAME: '${runtimeEnvAdminUsername}'`);
    console.log(`getSession: For env_admin check - Runtime process.env.ADMIN_PASSWORD is ${process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET'}`);

    if (runtimeEnvAdminUsername) {
        console.log("getSession: 'superadmin_env_session' cookie validated successfully. Granting SuperAdmin (ENV) permissions.");
        return {
            username: runtimeEnvAdminUsername,
            roles: ["SuperAdmin (ENV)"],
            permissions: [ 
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
  
  // Placeholder for database user session validation (not currently used by SuperAdmin flow)
  console.log(`getSession: Cookie value '${sessionCookieValue}' is not SUPERADMIN_COOKIE_VALUE. No DB user session logic implemented.`);
  await cookieStore.delete(SESSION_COOKIE_NAME); // Unknown cookie, delete it
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
