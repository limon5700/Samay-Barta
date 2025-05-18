
"use server";

import { cookies as nextCookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { getUserByUsername, getUserById, getPermissionsForUser, getRoleById } from "@/lib/data";
import type { UserSession, Permission } from "@/lib/types";

// Helper to check critical env vars at runtime specifically for login
const checkLoginRequiredEnvVars = (): { success: boolean; error?: string } => {
  const MONGODB_URI_SET = !!process.env.MONGODB_URI;
  const ADMIN_USERNAME_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_SET = !!process.env.ADMIN_PASSWORD;

  console.log(`checkLoginRequiredEnvVars: MONGODB_URI is ${MONGODB_URI_SET ? "SET" : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_USERNAME is ${ADMIN_USERNAME_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  console.log(`checkLoginRequiredEnvVars: ADMIN_PASSWORD is ${ADMIN_PASSWORD_SET ? "SET (Is Set: true)" : "NOT SET"}`);

  if (!MONGODB_URI_SET) {
    console.error("CRITICAL FOR LOGIN: MONGODB_URI is NOT SET in process.env at runtime. Database operations will fail.");
    return { success: false, error: "Server configuration error (DB_CONNECT_LOGIN_CHECK). Please contact administrator."};
  }
  if (!ADMIN_USERNAME_SET) {
    console.error("CRITICAL FOR LOGIN: ADMIN_USERNAME is NOT SET in process.env at runtime. .env admin login will fail.");
     return { success: false, error: "Server admin username not configured. Contact administrator. (Error Code: ENV_ADMIN_USER_MISSING_LOGIN)" };
  }
  if (!ADMIN_PASSWORD_SET) {
    console.error("CRITICAL FOR LOGIN: ADMIN_PASSWORD is NOT SET in process.env at runtime. .env admin login will fail.");
    return { success: false, error: "Server admin password not configured. Contact administrator. (Error Code: ENV_ADMIN_PASS_MISSING_LOGIN)" };
  }
  return { success: true };
};

// Broader check for getSession and other general operations
const checkRequiredEnvVars = (): { success: boolean; error?: string } => {
  const MONGODB_URI_SET = !!process.env.MONGODB_URI;
  const ADMIN_USERNAME_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_SET = !!process.env.ADMIN_PASSWORD;
  const GEMINI_API_KEY_SET = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;

  // This console.log block is for getSession, not for loginAction's initial check
  // console.log(`checkRequiredEnvVars (General): MONGODB_URI is ${MONGODB_URI_SET ? "SET" : "NOT SET"}`);
  // console.log(`checkRequiredEnvVars (General): ADMIN_USERNAME is ${ADMIN_USERNAME_SET ? `SET (Value: '${process.env.ADMIN_USERNAME}')` : "NOT SET"}`);
  // console.log(`checkRequiredEnvVars (General): ADMIN_PASSWORD is ${ADMIN_PASSWORD_SET ? "SET (Is Set: true)" : "NOT SET"}`);
  // console.log(`checkRequiredEnvVars (General): GEMINI_API_KEY/GOOGLE_API_KEY is ${GEMINI_API_KEY_SET ? "SET" : "NOT SET"}`);
  
  if (!MONGODB_URI_SET) return { success: false, error: "MONGODB_URI is not configured on the server. (Error Code: GENERAL_DB_MISSING)"};
  if (!ADMIN_USERNAME_SET) return { success: false, error: "ADMIN_USERNAME is not configured on the server. (Error Code: GENERAL_ADMIN_USER_MISSING)"};
  if (!ADMIN_PASSWORD_SET) return { success: false, error: "ADMIN_PASSWORD is not configured on the server. (Error Code: GENERAL_ADMIN_PASS_MISSING)"};
  
  if (!GEMINI_API_KEY_SET) {
    console.warn("WARNING (General Check): GEMINI_API_KEY (or GOOGLE_API_KEY) is NOT SET in process.env at runtime. AI features may fail.");
  }
  return { success: true }; 
};


export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked. ABOUT TO CHECK LOGIN ENV VARS.");
  const loginEnvCheckResult = checkLoginRequiredEnvVars();
  if (!loginEnvCheckResult.success) {
    console.error(`loginAction: Login-critical environment variable check failed. Error: ${loginEnvCheckResult.error || "Unknown env var issue."}`);
    return { success: false, error: loginEnvCheckResult.error || "Server configuration error. Please contact administrator." };
  }
  console.log("loginAction: Login-critical environment variable check PASSED.");

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const currentRuntimeAdminUsername = process.env.ADMIN_USERNAME;
  const currentRuntimeAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentRuntimeAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentRuntimeAdminPassword ? `set (length: ${currentRuntimeAdminPassword.length})` : 'NOT SET'}`);
  console.log(`loginAction: Attempting login for username: '${username}'`);

  try {
    const cookieStore = await nextCookies();

    if (!currentRuntimeAdminUsername || !currentRuntimeAdminPassword) {
        console.error(`loginAction: CRITICAL - Server-side ADMIN_USERNAME ('${currentRuntimeAdminUsername}') or ADMIN_PASSWORD (is ${currentRuntimeAdminPassword ? 'set' : 'NOT SET'}) not configured properly at runtime. This should have been caught by checkLoginRequiredEnvVars.`);
        return { success: false, error: "Server admin credentials are not configured properly. Please contact administrator. (Error Code: SERVER_ENV_ADMIN_MISSING_AT_LOGIN_INTERNAL)" };
    }

    console.log(`loginAction: Server has .env credentials. Comparing submitted username '${username}' with runtime .env admin '${currentRuntimeAdminUsername}'.`);
    if (username === currentRuntimeAdminUsername) {
      console.log(`loginAction: .env admin username MATCHED. Comparing password.`);
      if (password === currentRuntimeAdminPassword) {
        console.log(`loginAction: About to set cookie for env_admin: ${currentRuntimeAdminUsername}`);
        await cookieStore.set(SESSION_COOKIE_NAME, "env_admin:" + currentRuntimeAdminUsername, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/",
          sameSite: "lax",
        });
        console.log("loginAction: Cookie for env_admin should be set. Admin login via .env credentials SUCCESSFUL for user:", username);
        return { success: true, redirectPath: "/admin/dashboard" };
      } else {
        console.warn("loginAction: Admin login via .env credentials FAILED - password mismatch for .env admin username:", username);
        return { success: false, error: "Invalid username or password." };
      }
    }

    console.log("loginAction: Submitted username is not the .env admin. Proceeding to database user login check for:", username);
    const user = await getUserByUsername(username);

    if (user && user.isActive) {
        console.log(`loginAction: Database user '${username}' found and is active.`);
        // IMPORTANT: In a real app, use a secure password hashing and comparison library like bcrypt.
        // const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        const passwordMatch = password === user.passwordHash; // Insecure direct comparison for simplicity here

        if (passwordMatch) {
            console.log(`loginAction: Database user password MATCH for: ${username}. About to set cookie for user_id: ${user.id}`);
            await cookieStore.set(SESSION_COOKIE_NAME, `user_id:${user.id}`, { 
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24 * 7,
                path: "/",
                sameSite: "lax",
            });
            console.log("loginAction: Database user session cookie should be set for user_id:", user.id);
            return { success: true, redirectPath: "/admin/dashboard" };
        } else {
            console.log("loginAction: Database user password MISMATCH for:", username);
        }
    } else if (user && !user.isActive) {
        console.log(`loginAction: Database user '${username}' found but is INACTIVE.`);
    } else {
        console.log(`loginAction: Database user '${username}' NOT FOUND.`);
    }

    console.log("loginAction: All login attempts FAILED for username:", username);
    return { success: false, error: "Invalid username or password." };

  } catch (e: any) {
    console.error("loginAction: ERROR during loginAction execution:", e.message, e.stack);
    let errorMessage = e.message || "An unknown server error occurred during login.";
    if (e.name === 'MongoNetworkError' || e.message?.includes('connect ECONNREFUSED') || e.message?.includes('querySrv')) {
        console.error("loginAction: Database connection error suspected:", e.message);
        errorMessage = `Database connection error. Details: ${errorMessage}`;
    }
    return { success: false, error: `Login Action Failed: ${errorMessage}` };
  }
}

export async function logoutAction() {
  'use server';
  console.log("logoutAction: Attempting to delete session cookie.");
  try {
    const cookieStore = await nextCookies();
    await cookieStore.delete(SESSION_COOKIE_NAME); 
    console.log("logoutAction: Session cookie deleted.");
  } catch (error) {
    console.error("logoutAction: Error deleting session cookie:", error);
  }
  redirect("/admin/login");
}

export async function getSession(): Promise<UserSession | null> {
  'use server';
  console.log("getSession: Invoked. ABOUT TO CHECK ENV VARS in getSession.");

  const generalEnvCheckResult = checkRequiredEnvVars();
  if (!generalEnvCheckResult.success) {
      console.error(`getSession: General environment variable check failed. Error: ${generalEnvCheckResult.error || "Essential server config missing."}`);
      // Do not delete cookie here; let middleware handle redirect if auth fails due to this.
      // Deleting cookie here might hide the root cause if env vars are missing.
      return null;
  }

  let cookieStore;
  try {
    cookieStore = await nextCookies();
  } catch (error) {
    console.error("getSession: Error calling nextCookies() in getSession:", error);
    return null;
  }

  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  console.log(`getSession: Value of sessionCookie?.value upon read: '${sessionCookieValue}' (Type: ${typeof sessionCookieValue})`);

  if (!sessionCookieValue || sessionCookieValue === 'undefined') {
    let reason = "cookie does not exist";
    if (sessionCookie && !sessionCookieValue && typeof sessionCookieValue !== 'string') reason = "cookie exists but value is null/empty/primitive undefined";
    if (sessionCookieValue === 'undefined') reason = "cookie value is the literal string 'undefined'";
    
    console.log(`getSession: No session cookie found for ${SESSION_COOKIE_NAME} (Reason: ${reason}, Value: '${sessionCookieValue}').`);
    
    const allCookiesDebug = await cookieStore.getAll(); 
    console.log(`getSession: DEBUG - All cookies present when ${SESSION_COOKIE_NAME} was problematic: ${JSON.stringify(allCookiesDebug.map(c => ({ name: c.name, value: c.value.substring(0,30) + (c.value.length > 30 ? '...' : '')})) )}`);
    
    if (sessionCookieValue === 'undefined') {
        console.error(`CRITICAL_SESSION_ERROR: Session cookie ${SESSION_COOKIE_NAME} had literal string 'undefined'. This is a serious issue. Ensuring cookie is cleared.`);
        await cookieStore.delete(SESSION_COOKIE_NAME);
    }
    return null;
  }

  console.log(`getSession: Raw cookie value for ${SESSION_COOKIE_NAME}: '${sessionCookieValue}'`);

  const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;
  const runtimeEnvAdminPasswordSet = !!process.env.ADMIN_PASSWORD;

  console.log(`getSession: For env_admin check - Runtime process.env.ADMIN_USERNAME: '${runtimeEnvAdminUsername}'`);
  console.log(`getSession: For env_admin check - Runtime process.env.ADMIN_PASSWORD is ${runtimeEnvAdminPasswordSet ? 'SET' : 'NOT SET'}`);


  if (sessionCookieValue.startsWith("env_admin:")) {
    const cookieUsername = sessionCookieValue.split(":")[1];
    console.log(`getSession: Found 'env_admin:' prefixed cookie. Username from cookie: '${cookieUsername}'`);

    if (!runtimeEnvAdminUsername || !runtimeEnvAdminPasswordSet) {
        console.warn(`CRITICAL_SESSION_FAILURE (env_admin check): env_admin cookie ('${cookieUsername}') present, but server-side ADMIN_USERNAME ('${runtimeEnvAdminUsername}') or ADMIN_PASSWORD (is ${runtimeEnvAdminPasswordSet ? 'set' : 'NOT SET'}) is NOT properly configured/available at runtime. This should have been caught by checkRequiredEnvVars. Cannot validate this session. Clearing cookie.`);
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }

    if (cookieUsername === runtimeEnvAdminUsername) {
        console.log("getSession: env_admin session validated successfully. Granting SuperAdmin (ENV) permissions.");
        const allPermissions: Permission[] = [
            'manage_articles', 'publish_articles', 'manage_users', 'manage_roles',
            'manage_layout_gadgets', 'manage_seo_global', 'manage_settings', 'view_admin_dashboard'
        ];
        return {
            username: runtimeEnvAdminUsername,
            roles: ["SuperAdmin (ENV)"],
            permissions: allPermissions,
            isEnvAdmin: true,
            isAuthenticated: true,
        };
    } else {
      console.warn(`CRITICAL_SESSION_MISMATCH (env_admin check): Cookie username ('${cookieUsername}') does not match server's runtime ADMIN_USERNAME ('${runtimeEnvAdminUsername}'). This could happen if ADMIN_USERNAME was changed after cookie was set. Clearing cookie.`);
      await cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }
  }

  if (sessionCookieValue.startsWith("user_id:")) {
    const userId = sessionCookieValue.split(":")[1];
    console.log(`getSession: Found 'user_id:' prefixed cookie. User ID from cookie: '${userId}'`);
    if (!userId) {
        console.warn("getSession: Invalid user_id cookie - no user ID found after colon. Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
    if (!process.env.MONGODB_URI) { 
        console.error("getSession: Cannot validate database user session because MONGODB_URI is not set. Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }

    try {
      console.log(`getSession: Attempting to fetch database user by ID: '${userId}'`);
      const user = await getUserById(userId);
      if (user && user.isActive) {
        console.log(`getSession: Database user '${user.username}' (ID: ${userId}) found and is active. Fetching permissions.`);
        const permissions = await getPermissionsForUser(user.id);
        const roleNames = [];
        if (user.roles && Array.isArray(user.roles)) {
          console.log(`getSession: User roles IDs: ${user.roles.join(', ')}. Fetching role names.`);
          for (const roleId of user.roles) {
              const role = await getRoleById(roleId);
              if (role) {
                roleNames.push(role.name);
              } else {
                console.warn(`getSession: Role with ID '${roleId}' not found for user '${user.username}'.`);
              }
          }
        } else {
            console.log(`getSession: User '${user.username}' has no roles or roles property is invalid.`);
        }
        console.log(`getSession: User '${user.username}' session validated. Roles: ${roleNames.join(', ') || 'None'}. Permissions count: ${permissions.length}`);
        return {
          userId: user.id,
          username: user.username,
          roles: roleNames,
          permissions,
          isEnvAdmin: false,
          isAuthenticated: true,
        };
      }

      if (!user) console.warn(`getSession: User with ID '${userId}' not found in database. Clearing cookie.`);
      if (user && !user.isActive) console.warn(`getSession: User '${user.username}' (ID: ${userId}) is inactive. Clearing cookie.`);
      await cookieStore.delete(SESSION_COOKIE_NAME); 
      return null;

    } catch (e: any) {
        console.error(`getSession: Error fetching session details for user ID '${userId}':`, e.message, e.stack, "Clearing cookie.");
        await cookieStore.delete(SESSION_COOKIE_NAME); 
        return null;
    }
  }

  console.warn(`getSession: Cookie format invalid or unhandled for value: '${sessionCookieValue}'. Clearing cookie.`);
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
