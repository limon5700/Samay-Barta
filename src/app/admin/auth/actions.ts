
'use server';

import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { LoginFormData, UserSession, Permission, User, Role } from '@/lib/types';
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';
import { getUserByUsername, getPermissionsForUser, addActivityLogEntry } from '@/lib/data';
import bcrypt from 'bcryptjs';
import { availablePermissions } from '@/lib/constants';

// Helper to check critical environment variables
async function checkLoginRequiredEnvVars(): Promise<{ error?: string }> {
  console.log("checkLoginRequiredEnvVars: Checking server environment variables for .env admin login...");
  const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_IS_SET = !!process.env.ADMIN_PASSWORD;
  // MONGODB_URI is implicitly checked by connectToDatabase, but good to acknowledge
  const MONGODB_URI_IS_SET = !!process.env.MONGODB_URI;


  console.log(`checkLoginRequiredEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_IS_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${ADMIN_PASSWORD_IS_SET ? "SET (Is Set: true)" : "NOT SET (Is Set: false)"}`);
  console.log(`checkLoginRequiredEnvVars: MONGODB_URI is ${MONGODB_URI_IS_SET ? "SET" : "NOT SET"}`);
  
  let missingVars = [];
  if (!ADMIN_USERNAME_IS_SET) missingVars.push("ADMIN_USERNAME");
  if (!ADMIN_PASSWORD_IS_SET) missingVars.push("ADMIN_PASSWORD");
  if (!MONGODB_URI_IS_SET) missingVars.push("MONGODB_URI (needed for database users)");
  
  if (!ADMIN_USERNAME_IS_SET || !ADMIN_PASSWORD_IS_SET) { // Only block login if .env admin creds are missing
    const errorMsg = `Server configuration error for admin login: ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set. Please set them in your .env file or Vercel environment variables. SuperAdmin login cannot proceed.`;
    console.error(`checkLoginRequiredEnvVars: ${errorMsg}`);
    return { error: errorMsg };
  }
  return {};
}


export async function loginAction(formData: LoginFormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked. ABOUT TO CHECK LOGIN ENV VARS.");
  const envCheckResult = await checkLoginRequiredEnvVars();
  if (envCheckResult.error) {
    // Only return error if .env admin login specifically is broken due to missing ADMIN_USERNAME/PASSWORD
    if (envCheckResult.error.includes("ADMIN_USERNAME or ADMIN_PASSWORD")) {
        return { success: false, error: envCheckResult.error };
    }
    // For other missing vars like MONGODB_URI, allow login to proceed if .env creds are used
    // but log a warning if db users might be affected.
    if (envCheckResult.error.includes("MONGODB_URI")) {
        console.warn("loginAction: MONGODB_URI is not set. Database user login will fail, but .env SuperAdmin login can proceed if credentials are correct.");
    }
  }

  const { username, password } = formData;
  if (!password) {
    return { success: false, error: "Password is required." };
  }

  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? "SET" : "NOT SET"}`);
  console.log(`loginAction: Attempting login for username: '${username}'`);

  try {
    const cookieStore = await nextCookies();

    // 1. Check .env SuperAdmin credentials
    if (currentRuntimeAdminUsername && currentRuntimeAdminPassword) {
      if (username === currentRuntimeAdminUsername && password === currentRuntimeAdminPassword) {
        console.log("loginAction: Admin login via .env credentials SUCCESSFUL for username:", currentRuntimeAdminUsername);
        await cookieStore.set(SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days for superadmin
        });
        console.log(`loginAction: Cookie '${SESSION_COOKIE_NAME}' set to '${SUPERADMIN_COOKIE_VALUE}'. Attempting redirect to /admin/dashboard.`);
        await addActivityLogEntry({ userId: 'SUPERADMIN_ENV', username: currentRuntimeAdminUsername, action: 'login_superadmin_env' });
        redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
      } else if (username === currentRuntimeAdminUsername) {
        // Username matched .env admin, but password was wrong
        console.log("loginAction: Admin login via .env credentials FAILED - password mismatch for username:", currentRuntimeAdminUsername);
        // Fall through to check database users if MONGODB_URI is set
      }
    } else {
      console.warn("loginAction: .env ADMIN_USERNAME or ADMIN_PASSWORD is not configured on the server. Skipping .env admin check.");
    }

    // 2. Check database users (only if MONGODB_URI is available)
    if (process.env.MONGODB_URI) {
        const user: User | null = await getUserByUsername(username);
        if (user && user.passwordHash && (await bcrypt.compare(password, user.passwordHash))) {
            if (!user.isActive) {
                console.log(`loginAction: Database user '${username}' is inactive. Login denied.`);
                return { success: false, error: "Your account is inactive. Please contact an administrator." };
            }
            console.log(`loginAction: Database user '${username}' login SUCCESSFUL.`);
            const sessionValue = `user_session:${user.id}`;
            await cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days for regular users
            });
            console.log(`loginAction: Cookie for database user set. Value: ${sessionValue}. Attempting redirect to /admin/dashboard.`);
            await addActivityLogEntry({ userId: user.id, username: user.username, action: 'login_db_user' });
            redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
        } else if (user) {
            console.log(`loginAction: Database user '${username}' found, but password mismatch.`);
        } else {
            console.log(`loginAction: Database user '${username}' not found.`);
        }
    } else {
        console.warn("loginAction: MONGODB_URI not set, cannot check database users. Only .env admin login is possible.");
    }


    // If neither .env admin nor database user login was successful
    console.log(`loginAction: All login attempts FAILED for username: '${username}'.`);
    return { success: false, error: "Invalid username or password." };

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
  let username = 'Unknown User'; // Default username if session isn't fully resolved
  try {
    const session = await getSession(); // Get session to log who is logging out
    if (session?.username) {
      username = session.username;
    }
    const cookieStore = await nextCookies();
    await cookieStore.delete(SESSION_COOKIE_NAME);
    console.log("logoutAction: Session cookie deleted.");
    await addActivityLogEntry({ userId: session?.userId || 'anonymous', username: username, action: 'logout' });
  } catch (error) {
    console.error("logoutAction: Error during logout process:", error);
  }
  redirect('/admin/login');
}


export async function getSession(): Promise<UserSession | null> {
  console.log("getSession: Invoked. ABOUT TO CHECK ENV VARS in getSession.");
  // No need to call checkLoginRequiredEnvVars here, as it's about reading the session.
  // However, checking if ADMIN_USERNAME is set is crucial for validating superadmin_env_session.
  
  const serverAdminUsername = process.env.ADMIN_USERNAME; // For SUPERADMIN_COOKIE_VALUE check

  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;
  
  console.log(`getSession: Value of sessionCookie '${SESSION_COOKIE_NAME}' upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);

  if (!sessionCookieValue || sessionCookieValue === 'undefined') {
    const allCookies = await cookieStore.getAll();
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME} or value is problematic. DEBUG - All cookies present:`, JSON.stringify(allCookies));
    if (sessionCookieValue === 'undefined') {
        console.warn(`getSession: CRITICAL_SESSION_ERROR - Session cookie ${SESSION_COOKIE_NAME} had literal string 'undefined'. This indicates a serious prior issue. Ensuring cookie is cleared.`);
        await cookieStore.delete(SESSION_COOKIE_NAME);
    }
    return null;
  }

  // Check for .env SuperAdmin session
  if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
    if (!serverAdminUsername) {
        console.warn("getSession: CRITICAL_SESSION_FAILURE - SUPERADMIN_COOKIE_VALUE found, but server ADMIN_USERNAME is NOT SET. This session is invalid. Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
    console.log(`getSession: '${SUPERADMIN_COOKIE_VALUE}' validated successfully. Granting SuperAdmin (ENV) permissions.`);
    return {
        isAuthenticated: true,
        userId: 'SUPERADMIN_ENV',
        username: serverAdminUsername,
        roles: ['SuperAdmin (ENV)'],
        permissions: [...availablePermissions], // SuperAdmin gets all defined permissions
        isSuperAdmin: true,
    };
  }

  // Check for database user session
  if (sessionCookieValue.startsWith('user_session:')) {
    if (!process.env.MONGODB_URI) {
        console.warn("getSession: Database user session cookie found, but MONGODB_URI is NOT SET on server. Cannot validate. Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
    const userId = sessionCookieValue.split(':')[1];
    if (!userId) {
        console.warn("getSession: Invalid database user session cookie format. Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
    try {
        const user = await getUserById(userId);
        if (user && user.isActive) {
            const permissions = await getPermissionsForUser(user.id);
            console.log(`getSession: Database user '${user.username}' session validated. Permissions:`, permissions);
            return {
                isAuthenticated: true,
                userId: user.id,
                username: user.username,
                roles: user.roles, // These would be role IDs, could fetch role names if needed
                permissions: permissions,
                isSuperAdmin: false,
            };
        } else if (user && !user.isActive) {
            console.log(`getSession: Database user '${user.username}' is inactive. Session invalidated. Clearing cookie.`);
        } else {
            console.log(`getSession: Database user with ID '${userId}' not found. Session invalidated. Clearing cookie.`);
        }
    } catch (dbError) {
        console.error(`getSession: Error fetching database user for session validation (ID: ${userId}):`, dbError);
    }
    // If DB user validation fails for any reason, clear the cookie
    await cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }
  
  // If cookie value is unrecognized
  console.warn(`getSession: Unrecognized session cookie value: '${sessionCookieValue}'. Invalidating session. Clearing cookie.`);
  await cookieStore.delete(SESSION_COOKIE_NAME);
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
        MONGODB_URI_VALUE: process.env.MONGODB_URI ? (process.env.MONGODB_URI.length > 30 ? process.env.MONGODB_URI.substring(0, 30) + "..." : process.env.MONGODB_URI) : "NOT SET",
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
