
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
  
  let missingVarsMessage = "";
  if (!ADMIN_USERNAME_IS_SET) missingVarsMessage += "ADMIN_USERNAME is not set. ";
  if (!ADMIN_PASSWORD_IS_SET) missingVarsMessage += "ADMIN_PASSWORD is not set. ";
  
  if (!ADMIN_USERNAME_IS_SET || !ADMIN_PASSWORD_IS_SET) {
    const errorMsg = `Server configuration error for admin login: ${missingVarsMessage}SuperAdmin login cannot proceed. Please set these in your .env file or Vercel environment variables.`;
    console.error(`checkLoginRequiredEnvVars: ${errorMsg}`);
    return { error: errorMsg };
  }
  return {};
}


export async function loginAction(formData: LoginFormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked. ABOUT TO CHECK LOGIN ENV VARS.");
  const envCheckError = await checkLoginRequiredEnvVars();
  if (envCheckError.error) {
    // If critical .env admin credentials are not set on the server, fail fast.
    console.error("loginAction: Failing due to missing server-side admin credentials as per checkLoginRequiredEnvVars.");
    return { success: false, error: envCheckError.error };
  }

  const { username, password } = formData;
  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? `set (length: ${currentRuntimeAdminPassword.length})` : "NOT SET"}`);
  console.log(`loginAction: Attempting login for username: '${username}'`);

  if (!password) {
    console.log("loginAction: Password field is empty.");
    return { success: false, error: "Password is required." };
  }

  try {
    const cookieStore = await nextCookies();

    // 1. Check .env SuperAdmin credentials
    if (username === currentRuntimeAdminUsername && password === currentRuntimeAdminPassword) {
      console.log(`loginAction: Admin login via .env credentials SUCCESSFUL for username: ${currentRuntimeAdminUsername}. Setting SUPERADMIN_COOKIE_VALUE.`);
      await cookieStore.set(SESSION_COOKIE_NAME, SUPERADMIN_COOKIE_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days for superadmin
      });
      console.log(`loginAction: Cookie '${SESSION_COOKIE_NAME}' set to '${SUPERADMIN_COOKIE_VALUE}'.`);
      console.log("loginAction: Attempting to log SUPERADMIN_ENV login activity.");
      await addActivityLogEntry({ userId: 'SUPERADMIN_ENV', username: currentRuntimeAdminUsername!, action: 'login_superadmin_env' });
      console.log("loginAction: About to redirect to /admin/dashboard for SuperAdmin.");
      redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
    } else if (username === currentRuntimeAdminUsername) {
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
            const sessionValue = `user_session:${user.id}`;
            await cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days for regular users
            });
            console.log(`loginAction: Cookie for database user set. Value: ${sessionValue}.`);
            await addActivityLogEntry({ userId: user.id, username: user.username, action: 'login_db_user' });
            console.log("loginAction: About to redirect to /admin/dashboard for DB user.");
            redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
        } else if (user) {
            console.log(`loginAction: Database user '${username}' found, but password mismatch.`);
        } else {
            console.log(`loginAction: Database user '${username}' not found.`);
        }
    } else {
        console.warn("loginAction: MONGODB_URI not set, cannot check database users. Only .env admin login is possible.");
    }

    console.log(`loginAction: All login attempts FAILED for username: '${username}'.`);
    return { success: false, error: "Invalid username or password." };

  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      console.log("loginAction: Caught NEXT_REDIRECT, re-throwing.");
      throw error; 
    }
    console.error("loginAction: UNEXPECTED CRITICAL ERROR during login:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `An unexpected server error occurred during login. Details: ${errorMessage}` };
  }
}

export async function logoutAction() {
  console.log("logoutAction: Attempting to logout.");
  let usernameToLog = 'Unknown User (logout)'; 
  let userIdToLog = 'anonymous_logout';
  try {
    const cookieStore = await nextCookies();
    const existingCookie = await cookieStore.get(SESSION_COOKIE_NAME);

    if (existingCookie) {
        if (existingCookie.value === SUPERADMIN_COOKIE_VALUE) {
            usernameToLog = process.env.ADMIN_USERNAME || 'SuperAdmin (ENV)';
            userIdToLog = 'SUPERADMIN_ENV';
        } else if (existingCookie.value.startsWith('user_session:')) {
            const tempUserId = existingCookie.value.split(':')[1];
            // Fetch username for logging if possible, otherwise use ID
            try {
                const user = await getUserById(tempUserId);
                usernameToLog = user ? user.username : `User (ID: ${tempUserId})`;
            } catch {
                usernameToLog = `User (ID: ${tempUserId} - name lookup failed)`;
            }
            userIdToLog = tempUserId;
        }
        console.log(`logoutAction: About to delete cookie for user: ${usernameToLog}`);
        await cookieStore.delete(SESSION_COOKIE_NAME);
        console.log("logoutAction: Session cookie deleted.");
        await addActivityLogEntry({ userId: userIdToLog, username: usernameToLog, action: 'logout' });
    } else {
        console.log("logoutAction: No session cookie found to delete.");
        await addActivityLogEntry({ userId: 'anonymous_logout', username: 'No active session', action: 'logout_attempt_no_cookie' });
    }

  } catch (error: any) {
    console.error("logoutAction: Error during logout process:", error);
     if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
  }
  redirect('/admin/login');
}

// Helper to check critical environment variables for SESSION VALIDATION
async function checkSessionValidationEnvVars(): Promise<{ error?: string, criticalForSuperAdmin?: boolean, criticalForDbUsers?: boolean }> {
  console.log("checkSessionValidationEnvVars: Checking server environment variables for session validation...");
  const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME; // For SUPERADMIN_COOKIE_VALUE validation
  const MONGODB_URI_IS_SET = !!process.env.MONGODB_URI; // For DB user session validation

  console.log(`checkSessionValidationEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_IS_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  console.log(`checkSessionValidationEnvVars: MONGODB_URI is ${MONGODB_URI_IS_SET ? "SET" : "NOT SET"}`);
  
  // No longer returning errors from here, getSession will handle the logic based on your request.
  // Warnings will still be logged by getSession itself if needed.
  return {};
}


export async function getSession(): Promise<UserSession | null> {
  console.log("getSession: Invoked. ABOUT TO CHECK ENV VARS in getSession.");
  // Call checkSessionValidationEnvVars to log status but don't block based on its return.
  // The actual logic for handling missing env vars is now inside getSession.
  await checkSessionValidationEnvVars(); 

  const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;
  const runtimeMongodbUri = process.env.MONGODB_URI;

  console.log(`getSession: Runtime process.env.ADMIN_USERNAME for env_admin check: '${runtimeEnvAdminUsername}'`);
  console.log(`getSession: Runtime process.env.MONGODB_URI for DB user session check: ${runtimeMongodbUri ? 'SET' : 'NOT SET'}`);

  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;
  
  console.log(`getSession: Value of sessionCookie?.value upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);
  
  if (!sessionCookieValue) {
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME} (cookie does not exist or value is null/primitive undefined).`);
    const allCookies = await cookieStore.getAll(); // Get all cookies for debugging
    console.log(`getSession: DEBUG - All cookies present on this request (when ${SESSION_COOKIE_NAME} was not found):`, JSON.stringify(allCookies.map(c => ({name: c.name, value: c.value.substring(0,30) + (c.value.length > 30 ? '...' : '') }))));
    return null;
  }
  
  if (sessionCookieValue === 'undefined') { // Literal string 'undefined'
      console.warn(`getSession: CRITICAL_SESSION_ERROR - Session cookie ${SESSION_COOKIE_NAME} had literal string 'undefined'. This indicates a serious prior issue. Ensuring cookie is cleared.`);
      await cookieStore.delete(SESSION_COOKIE_NAME); // Attempt to clear problematic cookie
      return null;
  }

  // Check for .env SuperAdmin session
  if (sessionCookieValue === SUPERADMIN_COOKIE_VALUE) {
    console.log(`getSession: For env_admin check - Runtime process.env.ADMIN_USERNAME: '${runtimeEnvAdminUsername}'`);
    console.log(`getSession: For env_admin check - Runtime process.env.ADMIN_PASSWORD is ${process.env.ADMIN_PASSWORD ? "SET" : "NOT SET"}`);
    if (!runtimeEnvAdminUsername) {
        console.warn("getSession: CRITICAL_SESSION_FAILURE - SUPERADMIN_COOKIE_VALUE found, but server ADMIN_USERNAME is NOT SET. This session is invalid. Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
    // For SuperAdmin, we also need to ensure the password is still set on the server,
    // as a basic integrity check, though we don't compare it here (that's done at login).
    if (!process.env.ADMIN_PASSWORD) {
        console.warn("getSession: CRITICAL_SESSION_FAILURE - SUPERADMIN_COOKIE_VALUE found, but server ADMIN_PASSWORD is NOT SET. This session is invalid for SuperAdmin. Clearing cookie.");
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
    if (!runtimeMongodbUri) { 
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
            console.log(`getSession: Database user '${user.username}' session validated. Permissions:`, permissions.map(p => p));
            return {
                isAuthenticated: true,
                userId: user.id,
                username: user.username,
                roles: user.roles, 
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
    await cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }
  
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
