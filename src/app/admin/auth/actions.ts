
"use server";

import { cookies as nextCookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { getUserByUsername, getUserById, getPermissionsForUser, getRoleById } from "@/lib/data";
import type { UserSession, Permission } from "@/lib/types";

// For password hashing in a real app:
// import bcrypt from 'bcryptjs';

// Module-level check for logging during server startup/build
const INITIAL_ENV_ADMIN_USERNAME = process.env.ADMIN_USERNAME;

// Helper to check critical env vars at runtime
const checkRequiredEnvVars = (): boolean => {
  const MONGODB_URI_SET = !!process.env.MONGODB_URI;
  const GEMINI_API_KEY_SET = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;
  const ADMIN_USERNAME_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_SET = !!process.env.ADMIN_PASSWORD;

  let allSet = true;
  if (!MONGODB_URI_SET) {
    console.error("CRITICAL: MONGODB_URI is NOT SET in process.env at runtime.");
    allSet = false;
  }
  // GEMINI_API_KEY is not strictly critical for login, but good to warn if AI features are expected.
  if (!GEMINI_API_KEY_SET) {
    console.warn("WARNING: GEMINI_API_KEY (or GOOGLE_API_KEY) is NOT SET in process.env at runtime. AI features may fail.");
  }
  if (!ADMIN_USERNAME_SET) {
    console.error("CRITICAL: ADMIN_USERNAME is NOT SET in process.env at runtime. .env admin login will fail.");
    allSet = false;
  }
  if (!ADMIN_PASSWORD_SET) {
    console.error("CRITICAL: ADMIN_PASSWORD is NOT SET in process.env at runtime. .env admin login will fail.");
    allSet = false;
  }
  
  return allSet; // Returns true only if critical vars for login are set.
};


export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked.");
  console.log(`loginAction: Initial process.env.ADMIN_USERNAME (at module load): '${INITIAL_ENV_ADMIN_USERNAME}'`);
  
  const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;
  const runtimeEnvAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${runtimeEnvAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${runtimeEnvAdminPassword ? `SET (length: ${runtimeEnvAdminPassword.length})` : 'NOT SET'}`);

  if (!runtimeEnvAdminUsername || !runtimeEnvAdminPassword) {
     console.error("loginAction: Server has NO ADMIN_USERNAME or ADMIN_PASSWORD configured in process.env at runtime. Cannot perform .env admin login.");
     // This error should be caught if a user tries to log in with the initial username but runtime vars are missing.
  }
  
  // Explicitly check for essential vars for any login path to proceed
  if (!process.env.MONGODB_URI) {
     console.error("loginAction: MONGODB_URI is NOT SET. Login cannot proceed securely.");
     return { success: false, error: "Server configuration error (DB). Please contact administrator. (Error Code: ENV_MISSING_DB_FOR_LOGIN)" };
  }


  try {
    const cookieStore = await nextCookies();
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    console.log(`loginAction: Attempting login for username: '${username}'`);

    // --- .ENV ADMIN LOGIN ATTEMPT ---
    if (runtimeEnvAdminUsername && runtimeEnvAdminPassword) {
      console.log(`loginAction: Server has .env credentials. Comparing submitted username '${username}' with runtime .env admin '${runtimeEnvAdminUsername}'.`);
      if (username === runtimeEnvAdminUsername) {
        console.log(`loginAction: .env admin username MATCHED. Comparing password.`);
        if (password === runtimeEnvAdminPassword) {
          console.log("loginAction: .env admin password MATCHED. Setting cookie for env_admin:", username);
          await cookieStore.set(SESSION_COOKIE_NAME, "env_admin:" + runtimeEnvAdminUsername, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
            sameSite: "lax",
          });
          console.log("loginAction: Admin login via .env credentials SUCCESSFUL for user:", username);
          // redirect("/admin/dashboard"); // Let client-side handle redirect based on returned path
          return { success: true, redirectPath: "/admin/dashboard" };
        } else {
          console.warn("loginAction: Admin login via .env credentials FAILED - password mismatch for .env admin username:", username);
          // Fall through to DB check
        }
      } else {
         console.log(`loginAction: Submitted username '${username}' does not match runtime .env admin username '${runtimeEnvAdminUsername}'. Will proceed to DB check.`);
      }
    } else {
      console.warn("loginAction: Server has NO ADMIN_USERNAME or ADMIN_PASSWORD configured in process.env at runtime. Cannot perform .env admin login.");
      // Check if the user *attempted* to log in as the INITIAL_ENV_ADMIN_USERNAME (from module load)
      // This specific log is for the case where the .env might have existed at build time but not runtime.
      if (username === INITIAL_ENV_ADMIN_USERNAME && INITIAL_ENV_ADMIN_USERNAME) {
         console.error(`loginAction: User attempted to log in as potential .env admin ('${username}'), but server has NO ADMIN_USERNAME or ADMIN_PASSWORD configured in process.env at runtime. This is a server configuration issue (e.g., missing in Vercel).`);
         return { success: false, error: "Server-side admin credentials are not configured. Please contact administrator. (Error Code: ENV_ADMIN_RUNTIME_MISSING)" };
      }
    }
    
    console.log("loginAction: Proceeding to database user login check for:", username);
    const user = await getUserByUsername(username);

    if (user && user.isActive) {
      console.log(`loginAction: Database user '${username}' found and is active.`);
      // In a real app, use bcrypt.compare(password, user.passwordHash);
      const passwordMatch = password === user.passwordHash; 

      if (passwordMatch) {
        console.log("loginAction: Database user password MATCH for:", username);
        await cookieStore.set(SESSION_COOKIE_NAME, `user_id:${user.id}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, 
          path: "/",
          sameSite: "lax",
        });
        console.log("loginAction: Database user session cookie set for user_id:", user.id);
        // redirect("/admin/dashboard"); // Let client-side handle redirect
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
    if (e.digest?.startsWith('NEXT_REDIRECT')) {
      console.log("loginAction: Caught NEXT_REDIRECT, re-throwing.");
      throw e; // Important to re-throw for Next.js to handle the redirect
    }
    console.error("loginAction: UNEXPECTED CRITICAL ERROR during loginAction execution:", e.message, e.stack);
    const errorMessage = e.message || "An unknown server error occurred.";
    return { success: false, error: `An unexpected server error occurred during login. Please check server logs. Details: ${errorMessage}` };
  }
}

export async function logoutAction() {
  'use server';
  const cookieStore = await nextCookies();
  console.log("logoutAction: Deleting session cookie and redirecting to /admin/login.");
  await cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

export async function getSession(): Promise<UserSession | null> {
  'use server';
  console.log("getSession: Invoked.");

  const MONGODB_URI_IS_SET = !!process.env.MONGODB_URI;
  const ADMIN_USERNAME_IS_SET = !!process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_IS_SET = !!process.env.ADMIN_PASSWORD;

  if (!MONGODB_URI_IS_SET) {
    console.error("CRITICAL_FOR_SESSION: MONGODB_URI is NOT SET in getSession. Database user sessions cannot be validated.");
  }
  if (!ADMIN_USERNAME_IS_SET || !ADMIN_PASSWORD_IS_SET) {
    console.warn("WARNING_FOR_SESSION: ADMIN_USERNAME or ADMIN_PASSWORD is NOT SET in getSession. .env admin sessions cannot be validated.");
  }
  
  const cookieStore = await nextCookies();
  const sessionCookie = await cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  if (sessionCookieValue === undefined) {
    console.log(`getSession: No session cookie found or value is primitive undefined (cookie for ${SESSION_COOKIE_NAME} does not exist or no value).`);
    return null;
  } else if (sessionCookieValue === null) { // Should not happen with next/headers cookies().get
    console.log(`getSession: Session cookie ${SESSION_COOKIE_NAME} is null. Treating as no session.`);
    return null;
  } else if (sessionCookieValue === 'undefined') { // The literal string "undefined"
     console.warn(`getSession: Session cookie ${SESSION_COOKIE_NAME} has the string value 'undefined'. This indicates a potential issue with how the cookie was set or cleared. Treating as no session.`);
     return null;
  }
  console.log(`getSession: Raw cookie value for ${SESSION_COOKIE_NAME}: '${sessionCookieValue}'`);


  const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;
  console.log(`getSession: Runtime process.env.ADMIN_USERNAME for env_admin check: '${runtimeEnvAdminUsername}'`);

  if (sessionCookieValue.startsWith("env_admin:")) {
    const cookieUsername = sessionCookieValue.split(":")[1];
    console.log(`getSession: Found 'env_admin:' prefixed cookie. Username from cookie: '${cookieUsername}'`);

    // Critical check: Are the runtime env vars for admin even available?
    if (!runtimeEnvAdminUsername || !process.env.ADMIN_PASSWORD) {
        console.warn(`getSession: env_admin cookie ('${cookieUsername}') present, but server-side ADMIN_USERNAME or ADMIN_PASSWORD is NOT SET at runtime. Cannot validate. Clearing cookie.`);
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
      console.warn(`getSession: env_admin cookie validation FAILED. Cookie username: '${cookieUsername}', Runtime env username: '${runtimeEnvAdminUsername}'. This could be due to process.env.ADMIN_USERNAME not being available/mismatching at this execution, or a stale cookie. Clearing cookie.`);
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
    if (!MONGODB_URI_IS_SET) {
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

  console.warn(`getSession: Cookie format invalid or unhandled. Cookie value: '${sessionCookieValue}'. Clearing cookie.`);
  await cookieStore.delete(SESSION_COOKIE_NAME);
  return null;
}
