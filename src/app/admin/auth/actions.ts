
'use server';

import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { LoginFormData, UserSession, Permission, User, Role, CreateActivityLogData } from '@/lib/types';
import { SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE } from '@/lib/auth-constants';
import { getUserByUsername, getPermissionsForUser, addActivityLogEntry, getUserById } from '@/lib/data';
import bcrypt from 'bcryptjs';
import { availablePermissions } from '@/lib/constants';

// Helper to check critical environment variables for LOGIN
async function checkLoginRequiredEnvVars(): Promise<{ error?: string }> {
  console.log("checkLoginRequiredEnvVars: Checking server environment variables for .env admin login...");
  const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_IS_SET = !!process.env.ADMIN_PASSWORD;
  const MONGODB_URI_IS_SET = !!process.env.MONGODB_URI; // For DB user fallback

  console.log(`checkLoginRequiredEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_IS_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${ADMIN_PASSWORD_IS_SET ? "SET (Is Set: true)" : "NOT SET (Is Set: false)"}`);
  console.log(`checkLoginRequiredEnvVars: MONGODB_URI is ${MONGODB_URI_IS_SET ? "SET" : "NOT SET"}`);
  
  let missingVars = [];
  if (!ADMIN_USERNAME_IS_SET) missingVars.push("ADMIN_USERNAME");
  if (!ADMIN_PASSWORD_IS_SET) missingVars.push("ADMIN_PASSWORD");
  // Do not block if MONGODB_URI is missing, as .env admin login should still be possible.
  
  if (!ADMIN_USERNAME_IS_SET || !ADMIN_PASSWORD_IS_SET) {
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
    return { success: false, error: envCheckResult.error };
  }

  const { username, password } = formData;

  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? "SET" : "NOT SET"}`);
  console.log(`loginAction: Attempting login for username: '${username}'`);

  if (!password) {
    console.log("loginAction: Password field is empty.");
    return { success: false, error: "Password is required." };
  }

  try {
    const cookieStore = await nextCookies();

    // 1. Check .env SuperAdmin credentials
    // This check is now more direct using currentRuntimeAdminUsername/Password loaded at the start of this function
    if (username === currentRuntimeAdminUsername && password === currentRuntimeAdminPassword) {
      console.log(`loginAction: Admin login via .env credentials SUCCESSFUL for username: ${currentRuntimeAdminUsername}. Setting SUPERADMIN_COOKIE_VALUE.`);
      await cookieStore.set(SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days for superadmin persistence
      });
      console.log(`loginAction: Cookie '${SESSION_COOKIE_NAME}' set to '${SUPERADMIN_COOKIE_VALUE}'. Attempting redirect to /admin/dashboard.`);
      await addActivityLogEntry({ userId: 'SUPERADMIN_ENV', username: currentRuntimeAdminUsername, action: 'login_superadmin_env' });
      redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
    } else if (username === currentRuntimeAdminUsername) {
      // Username matched .env admin, but password was wrong
      console.log("loginAction: Admin login via .env credentials FAILED - password mismatch for username:", currentRuntimeAdminUsername);
      // Fall through to check database users if MONGODB_URI is set
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
            const sessionValue = `user_session:${user.id}`; // Different value for DB users
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
    if (error.message?.includes('NEXT_REDIRECT')) { // Check if it's a NEXT_REDIRECT error
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
  let username = 'Unknown User'; 
  try {
    // const session = await getSession(); // Call getSession to know who is logging out
    // if (session?.username) {
    //   username = session.username;
    // }
    const cookieStore = await nextCookies();
    const existingCookie = await cookieStore.get(SESSION_COOKIE_NAME);
    if (existingCookie) {
        // Attempt to get session info before deleting for logging purposes
        // This part might be tricky if getSession itself has issues or depends on a valid cookie
        // For simplicity, we'll log based on a direct read if possible, or just log generic logout
        const tempSession = await getSession(); // Try to get session details
        username = tempSession?.username || 'Unknown User (from cookie before delete)';
        await addActivityLogEntry({ userId: tempSession?.userId || 'anonymous_logout', username: username, action: 'logout' });
    } else {
        await addActivityLogEntry({ userId: 'anonymous_logout', username: 'No active session', action: 'logout_attempt_no_cookie' });
    }

    await cookieStore.delete(SESSION_COOKIE_NAME);
    console.log("logoutAction: Session cookie deleted.");

  } catch (error: any) {
    console.error("logoutAction: Error during logout process:", error);
     if (error.message?.includes('NEXT_REDIRECT')) {
      throw error;
    }
  }
  redirect('/admin/login');
}

// Helper to check critical environment variables for SESSION VALIDATION
// Note: This is slightly different from checkLoginRequiredEnvVars
// For getSession, only ADMIN_USERNAME is strictly needed for superadmin_env_session validation
// MONGODB_URI is needed for database user session validation
async function checkSessionValidationEnvVars(): Promise<{ error?: string, criticalForSuperAdmin?: boolean, criticalForDbUsers?: boolean }> {
  console.log("checkSessionValidationEnvVars: Checking server environment variables for session validation...");
  const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME;
  const MONGODB_URI_IS_SET = !!process.env.MONGODB_URI;

  console.log(`checkSessionValidationEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_IS_SET ? "SET" : "NOT SET"}`);
  console.log(`checkSessionValidationEnvVars: MONGODB_URI is ${MONGODB_URI_IS_SET ? "SET" : "NOT SET"}`);
  
  if (!ADMIN_USERNAME_IS_SET) {
    const errorMsg = `Server configuration error for session validation: ADMIN_USERNAME environment variable is not set. SuperAdmin session ('${SUPERADMIN_COOKIE_VALUE}') cannot be validated.`;
    console.error(`checkSessionValidationEnvVars: ${errorMsg}`);
    return { error: errorMsg, criticalForSuperAdmin: true };
  }
  if (!MONGODB_URI_IS_SET) {
    // This is a warning, not a critical error if only superadmin is used.
    console.warn(`checkSessionValidationEnvVars: MONGODB_URI is not set. Database user sessions cannot be validated.`);
    return { error: "MONGODB_URI not set, DB user sessions will fail.", criticalForDbUsers: true };
  }
  return {};
}


export async function getSession(): Promise<UserSession | null> {
  console.log("getSession: Invoked. ABOUT TO CHECK ENV VARS in getSession.");
  
  // Check if essential env vars for any session validation are present.
  // For SUPERADMIN_COOKIE_VALUE, only ADMIN_USERNAME is strictly needed at this point.
  // For database users, MONGODB_URI is needed.
  const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;
  const runtimeMongodbUri = process.env.MONGODB_URI;

  console.log(`getSession: Runtime process.env.ADMIN_USERNAME for SUPERADMIN_COOKIE_VALUE check: '${runtimeEnvAdminUsername}'`);
  console.log(`getSession: Runtime process.env.MONGODB_URI for DB user session check: ${runtimeMongodbUri ? 'SET' : 'NOT SET'}`);

  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;
  
  console.log(`getSession: Value of sessionCookie '${SESSION_COOKIE_NAME}' upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);

  if (!sessionCookieValue || sessionCookieValue === 'undefined') {
    const allCookies = await cookieStore.getAll();
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME} (cookie does not exist or value is null/primitive undefined). DEBUG - All cookies present:`, JSON.stringify(allCookies));
    if (sessionCookieValue === 'undefined') { // Literal string 'undefined'
        console.warn(`getSession: CRITICAL_SESSION_ERROR - Session cookie ${SESSION_COOKIE_NAME} had literal string 'undefined'. This indicates a serious prior issue. Ensuring cookie is cleared.`);
        await cookieStore.delete(SESSION_COOKIE_NAME); // Attempt to clear problematic cookie
    }
    return null;
  }

  // Check for .env SuperAdmin session
  if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
    if (!runtimeEnvAdminUsername) { // If ADMIN_USERNAME is not set on the server, this session is invalid
        console.warn("getSession: CRITICAL_SESSION_FAILURE - SUPERADMIN_COOKIE_VALUE found, but server ADMIN_USERNAME is NOT SET. This session is invalid. Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
    console.log(`getSession: '${SUPERADMIN_COOKIE_VALUE}' validated successfully against runtime ADMIN_USERNAME ('${runtimeEnvAdminUsername}'). Granting SuperAdmin (ENV) permissions.`);
    return {
        isAuthenticated: true,
        userId: 'SUPERADMIN_ENV',
        username: runtimeEnvAdminUsername,
        roles: ['SuperAdmin (ENV)'],
        permissions: [...availablePermissions], 
        isSuperAdmin: true,
    };
  }

  // Check for database user session
  if (sessionCookieValue.startsWith('user_session:')) {
    if (!runtimeMongodbUri) { // If MONGODB_URI is not set, cannot validate DB users
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
        const user = await getUserById(userId); // This function internally uses connectToDatabase
        if (user && user.isActive) {
            const permissions = await getPermissionsForUser(user.id);
            console.log(`getSession: Database user '${user.username}' session validated. Permissions:`, permissions);
            return {
                isAuthenticated: true,
                userId: user.id,
                username: user.username,
                roles: user.roles, 
                permissions: permissions,
                isSuperAdmin: false, // Database users are not .env SuperAdmins
            };
        } else if (user && !user.isActive) {
            console.log(`getSession: Database user '${user.username}' is inactive. Session invalidated. Clearing cookie.`);
        } else {
            console.log(`getSession: Database user with ID '${userId}' not found. Session invalidated. Clearing cookie.`);
        }
    } catch (dbError) {
        console.error(`getSession: Error fetching database user for session validation (ID: ${userId}):`, dbError);
    }
    // If DB user validation fails for any reason (user not found, inactive, DB error), clear the cookie
    await cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }
  
  // If cookie value is unrecognized
  console.warn(`getSession: Unrecognized session cookie value: '${sessionCookieValue}'. Invalidating session. Clearing cookie.`);
  await cookieStore.delete(SESSION_COOKIE_NAME);
  return null;
}

// This action is for client-side components to check server configuration status
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
        ADMIN_PASSWORD_IS_SET, // Just its presence, not the value
        GEMINI_API_KEY_IS_SET,
        NODE_ENV: process.env.NODE_ENV || "NOT SET",
        VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET (Likely local or not on Vercel)",
    };
    console.log("checkServerVarsAction: Current server environment variables status:", vars);
    return vars;
}
