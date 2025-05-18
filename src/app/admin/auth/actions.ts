
'use server';

import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getUserByUsername,
  getUserById,
  getPermissionsForUser,
  getRoleById,
} from '@/lib/data';
import type { UserSession, Permission } from '@/lib/types';
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants';

// Helper to check critical environment variables for login functionality
const checkLoginRequiredEnvVars = (): { success: boolean; error?: string } => {
  const MONGODB_URI_SET = !!process.env.MONGODB_URI;
  const ADMIN_USERNAME_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_SET = !!process.env.ADMIN_PASSWORD;

  console.log(
    `checkLoginRequiredEnvVars: MONGODB_URI is ${
      MONGODB_URI_SET ? 'SET' : 'NOT SET'
    }`
  );
  console.log(
    `checkLoginRequiredEnvVars: ADMIN_USERNAME is ${
      ADMIN_USERNAME_SET
        ? `SET (Value: '${process.env.ADMIN_USERNAME}')`
        : 'NOT SET'
    }`
  );
  console.log(
    `checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${
      ADMIN_PASSWORD_SET ? 'SET (Is Set: true)' : 'NOT SET'
    }`
  );

  if (!MONGODB_URI_SET) {
    return {
      success: false,
      error:
        'Server configuration error (DB_CONNECT_LOGIN_CHECK). Please contact administrator.',
    };
  }
  if (!ADMIN_USERNAME_SET) {
    return {
      success: false,
      error:
        'Server admin username not configured. Contact administrator. (Error Code: ENV_ADMIN_USER_MISSING_LOGIN)',
    };
  }
  if (!ADMIN_PASSWORD_SET) {
    return {
      success: false,
      error:
        'Server admin password not configured. Contact administrator. (Error Code: ENV_ADMIN_PASS_MISSING_LOGIN)',
    };
  }
  return { success: true };
};

// Helper to check general required environment variables for app functionality (used by getSession)
const checkRequiredEnvVarsForSession = (): { success: boolean; error?: string } => {
  const MONGODB_URI_SET = !!process.env.MONGODB_URI;
  const ADMIN_USERNAME_SET = !!process.env.ADMIN_USERNAME;
  // ADMIN_PASSWORD is not strictly needed for getSession if only validating superadmin_env_session or DB user tokens
  const GEMINI_API_KEY_SET = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;

   console.log(
    `checkRequiredEnvVarsForSession: MONGODB_URI is ${
      MONGODB_URI_SET ? 'SET' : 'NOT SET'
    }`
  );
    console.log(
    `checkRequiredEnvVarsForSession: ADMIN_USERNAME is ${
      ADMIN_USERNAME_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : 'NOT SET'
    }`
  );
   console.log(
    `checkRequiredEnvVarsForSession: GEMINI_API_KEY/GOOGLE_API_KEY is ${
      GEMINI_API_KEY_SET ? 'SET' : 'NOT SET'
    }`
  );

  if (!MONGODB_URI_SET)
    return {
      success: false,
      error:
        'MONGODB_URI is not configured on the server for session validation. (Error Code: SESSION_DB_MISSING)',
    };
  if (!ADMIN_USERNAME_SET) // Still need ADMIN_USERNAME to validate superadmin_env_session
    return {
      success: false,
      error:
        'ADMIN_USERNAME is not configured on the server for session validation. (Error Code: SESSION_ADMIN_USER_MISSING)',
    };
  
  if (!GEMINI_API_KEY_SET) {
    console.warn("WARNING (Session Check): GEMINI_API_KEY (or GOOGLE_API_KEY) is NOT SET in process.env at runtime. AI features may fail if session relies on them indirectly.");
  }
  return { success: true };
};


export async function loginAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log('loginAction: Invoked. ABOUT TO CHECK LOGIN ENV VARS.');
  const envCheckResult = checkLoginRequiredEnvVars();
  if (!envCheckResult.success) {
    console.error('loginAction: Prerequisite environment variables check failed:', envCheckResult.error);
    return { success: false, error: envCheckResult.error || "Server configuration error." };
  }

  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  console.log(`loginAction: Attempting login for username: '${username}'`);

  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? 'set (length: ' + currentRuntimeAdminPassword.length + ')' : 'NOT SET'}`);

  const cookieStore = await nextCookies();

  try {
    if (username === currentRuntimeAdminUsername) {
      if (!currentRuntimeAdminUsername || !currentRuntimeAdminPassword) {
        const errorMsg = "Server has no ADMIN_USERNAME or ADMIN_PASSWORD configured in process.env at runtime. Cannot validate .env admin.";
        console.error(`loginAction: ${errorMsg}`);
        return { success: false, error: "Admin credentials not configured on the server. Please contact administrator." };
      }
      if (password === currentRuntimeAdminPassword) {
        console.log('loginAction: Admin login via .env credentials SUCCESSFUL for username:', username);
        const cookieValue = "superadmin_env_session"; // Special value for superadmin
        console.log(`loginAction: About to set cookie for superadmin: ${cookieValue}`);
        await cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year for superadmin persistence
        });
        console.log(`loginAction: Cookie for superadmin_env_session should be set.`);
        redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
      } else {
        console.warn('loginAction: Admin login via .env credentials FAILED - password mismatch for username:', username);
        // Fall through to check database users, or return error
      }
    }

    console.log(`loginAction: Username '${username}' did not match .env admin or password incorrect. Checking database...`);
    const user = await getUserByUsername(username);

    if (!user) {
      console.log(`loginAction: User '${username}' not found in database.`);
      return { success: false, error: 'Invalid username or password.' };
    }

    const isPasswordValid = password === user.passwordHash;

    if (isPasswordValid) {
      console.log(`loginAction: Database user '${username}' login SUCCESSFUL.`);
      const cookieValue = `user:${user.id}`;
      console.log(`loginAction: About to set cookie for database user: ${cookieValue}`);
      await cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week for regular users
      });
      console.log(`loginAction: Cookie for user:${user.id} should be set.`);
      redirect('/admin/dashboard'); // This will throw NEXT_REDIRECT
    } else {
      console.log(`loginAction: Password mismatch for database user '${username}'.`);
      return { success: false, error: 'Invalid username or password.' };
    }
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      console.log("loginAction: Caught NEXT_REDIRECT, re-throwing.");
      throw error; // Re-throw NEXT_REDIRECT to be handled by Next.js
    }
    console.error('loginAction: UNEXPECTED CRITICAL ERROR during login processing:', error);
    return {
      success: false,
      error: `An unexpected server error occurred during login. Please check server logs. Details: ${error.message || 'Unknown error'}`,
    };
  }
}

export async function logoutAction() {
  'use server';
  console.log('logoutAction: Invoked.');
  const cookieStore = await nextCookies();
  console.log(`logoutAction: Deleting cookie: ${SESSION_COOKIE_NAME}`);
  await cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/admin/login');
}

export async function getSession(): Promise<UserSession | null> {
  console.log('getSession: Invoked. ABOUT TO CHECK ENV VARS in getSession.');
  const envCheck = checkRequiredEnvVarsForSession();
  if (!envCheck.success) {
    console.error("getSession: General environment variable check failed:", envCheck.error);
    return null;
  }

  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  console.log(`getSession: Value of sessionCookie?.value upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);

  if (!sessionCookieValue) {
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME} (cookie does not exist or value is null/primitive undefined).`);
    const allCookies = await cookieStore.getAll();
    console.log(`getSession DEBUG - All cookies present on this request:`, allCookies.map(c => `${c.name}=${c.value.substring(0,30)}...`).join('; ') || 'NONE');
    return null;
  }
  
  if (sessionCookieValue === 'undefined') {
     console.warn(`CRITICAL_SESSION_ERROR: Session cookie ${SESSION_COOKIE_NAME} had the literal string 'undefined'. This indicates a serious problem. Clearing problematic cookie.`);
     await cookieStore.delete(SESSION_COOKIE_NAME);
     return null;
  }

  console.log(`getSession: Raw cookie value for ${SESSION_COOKIE_NAME}: '${sessionCookieValue}'`);

  const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;

  if (sessionCookieValue === "superadmin_env_session") {
    console.log("getSession: Found 'superadmin_env_session' cookie.");
    if (!runtimeEnvAdminUsername) {
        console.warn(`CRITICAL_SESSION_FAILURE: 'superadmin_env_session' cookie found, but server has no ADMIN_USERNAME configured in process.env AT RUNTIME. Clearing invalid cookie.`);
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
    console.log('getSession: 'superadmin_env_session' validated successfully. Granting SuperAdmin (ENV) permissions.');
    const allPermissions: Permission[] = [
      'manage_articles', 'publish_articles', 'manage_users', 'manage_roles',
      'manage_layout_gadgets', 'manage_seo_global', 'manage_settings', 'view_admin_dashboard'
    ];
    return {
      username: runtimeEnvAdminUsername, // Use the server's current ADMIN_USERNAME
      roles: ["SuperAdmin (ENV)"],
      permissions: allPermissions,
      isEnvAdmin: true,
      isAuthenticated: true,
    };
  }

  if (sessionCookieValue.startsWith('user:')) {
    const userId = sessionCookieValue.split(':')[1];
    console.log(`getSession: Found 'user:' prefixed cookie. User ID from cookie: '${userId}'`);
    if (!userId) {
      console.warn(`getSession: Invalid user ID in cookie. Clearing cookie.`);
      await cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }
    const user = await getUserById(userId);
    if (user) {
      console.log(`getSession: Database user session for '${user.username}' validated successfully.`);
      const permissions = await getPermissionsForUser(user.id);
      const roleObjects = await Promise.all((user.roles || []).map(roleId => getRoleById(roleId)));
      const roleNames = roleObjects.filter(r => r).map(r => r!.name);

      return {
        userId: user.id,
        username: user.username,
        roles: roleNames,
        permissions,
        isEnvAdmin: false,
        isAuthenticated: true,
      };
    } else {
      console.warn(`getSession: User ID '${userId}' from cookie not found in database. Clearing invalid cookie.`);
      await cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }
  }

  // If cookie value is not "superadmin_env_session" and doesn't start with "user:", it's an unknown/invalid format.
  // This also covers the old "env_admin:username" format which is now deprecated by "superadmin_env_session".
  console.warn(`getSession: Cookie value '${sessionCookieValue}' does not match known session formats ('superadmin_env_session' or 'user:'). Clearing potentially invalid cookie.`);
  await cookieStore.delete(SESSION_COOKIE_NAME);
  return null;
}

export async function checkServerVarsAction(): Promise<Record<string, string | boolean>> {
    "use server";
    console.log("checkServerVarsAction: Invoked from client.");
    const vars = {
        MONGODB_URI_IS_SET: !!process.env.MONGODB_URI,
        ADMIN_USERNAME_IS_SET: !!process.env.ADMIN_USERNAME,
        ADMIN_USERNAME_VALUE: process.env.ADMIN_USERNAME || "NOT SET",
        ADMIN_PASSWORD_IS_SET: !!process.env.ADMIN_PASSWORD,
        GEMINI_API_KEY_IS_SET: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY,
        NODE_ENV: process.env.NODE_ENV || "NOT SET",
        VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET (Likely local or not on Vercel)",
    };
    console.log("checkServerVarsAction: Current server environment variables status:", vars);
    return vars;
}
