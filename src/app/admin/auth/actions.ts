
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { getUserByUsername, getUserById, getPermissionsForUser, getRoleById } from "@/lib/data";
import type { UserSession, Permission } from "@/lib/types";

// For password hashing in a real app:
// import bcrypt from 'bcryptjs';

// Module-level check for logging during server startup/build
const INITIAL_ENV_ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const INITIAL_ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!INITIAL_ENV_ADMIN_USERNAME || !INITIAL_ENV_ADMIN_PASSWORD) {
  console.warn(
    "Warning (module load): ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set in process.env. Fallback admin login might not function as expected if these are also unavailable at runtime in loginAction."
  );
} else {
  console.log("Info (module load): ADMIN_USERNAME and ADMIN_PASSWORD appear to be set in process.env at module load time.");
}

export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  console.log("loginAction: Invoked.");
  const cookieStore = cookies();

  const currentEnvAdminUsername = process.env.ADMIN_USERNAME;
  const currentEnvAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentEnvAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentEnvAdminPassword ? 'set (length: ' + currentEnvAdminPassword.length + ')' : 'NOT SET'}`);

  if (!currentEnvAdminUsername || !currentEnvAdminPassword) {
    console.error("loginAction: CRITICAL FAILURE - ADMIN_USERNAME or ADMIN_PASSWORD is NOT SET in the server environment at runtime. .env admin login is impossible.");
    // Do not immediately return here if we want to allow database logins as a fallback.
    // However, if the submitted username matches what the admin username *should* be,
    // then it's a server misconfiguration for that specific login type.
  }

  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    console.log(`loginAction: Attempting login for username: '${username}'`);

    // Attempt .env admin login only if server has .env credentials configured
    if (currentEnvAdminUsername && currentEnvAdminPassword) {
      if (username === currentEnvAdminUsername && password === currentEnvAdminPassword) {
        cookieStore.set(SESSION_COOKIE_NAME, "env_admin:" + currentEnvAdminUsername, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/",
          sameSite: "lax",
        });
        console.log("loginAction: Admin login via .env credentials SUCCESSFUL for user:", username);
        return { success: true, redirectPath: "/admin/dashboard" };
      } else if (username === currentEnvAdminUsername) {
        // Username matches .env admin, but password doesn't
        console.log("loginAction: Admin login via .env credentials FAILED - password mismatch for .env admin username:", username);
        // Fall through to database check, or return specific error if preferred
      }
    } else if (username === INITIAL_ENV_ADMIN_USERNAME && INITIAL_ENV_ADMIN_USERNAME) {
      // User attempted to log in with what *should* be the .env admin username,
      // but server doesn't have them configured at runtime.
      console.error(`loginAction: User attempted to log in as .env admin ('${username}'), but server has no ADMIN_USERNAME/ADMIN_PASSWORD configured at runtime.`);
      return { success: false, error: "Server-side admin credentials are not configured. Please contact administrator." };
    }

    console.log("loginAction: Proceeding to database user login check for:", username);
    const user = await getUserByUsername(username);

    if (user && user.isActive) {
      console.log(`loginAction: Database user '${username}' found and is active.`);
      // IMPORTANT: Plain text password comparison. In a real app, use bcrypt.compare()
      const passwordMatch = password === user.passwordHash; // NEVER use this in production

      if (passwordMatch) {
        console.log("loginAction: Database user password MATCH for:", username);
        cookieStore.set(SESSION_COOKIE_NAME, `user_id:${user.id}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/",
          sameSite: "lax",
        });
        console.log("loginAction: Database user session cookie set for user_id:", user.id);
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
    console.error("loginAction: UNEXPECTED CRITICAL ERROR during loginAction execution:", e.message, e.stack);
    return { success: false, error: `An unexpected server error occurred. Please check server logs. Details: ${e.message}` };
  }
}

export async function logoutAction() {
  'use server';
  const cookieStore = cookies();
  console.log("logoutAction: Deleting session cookie and redirecting to /admin/login.");
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

export async function getSession(): Promise<UserSession | null> {
  'use server';
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  // More detailed logging for the cookie value itself
  if (sessionCookieValue === undefined) {
    console.log(`getSession: Raw cookie value for ${SESSION_COOKIE_NAME} is primitive undefined.`);
  } else if (sessionCookieValue === null) {
    console.log(`getSession: Raw cookie value for ${SESSION_COOKIE_NAME} is null.`);
  } else {
    console.log(`getSession: Raw cookie value for ${SESSION_COOKIE_NAME}: '${sessionCookieValue}'`);
  }


  if (!sessionCookieValue || sessionCookieValue === 'undefined') { // Handle both undefined primitive and string 'undefined'
    console.log("getSession: No session cookie found or value is 'undefined'.");
    if (sessionCookieValue === 'undefined') {
        console.warn("getSession: Cookie value was literally 'undefined'. This might indicate an issue with cookie setting/retrieval or prior deletion.");
    }
    return null;
  }

  if (sessionCookieValue.startsWith("env_admin:")) {
    const cookieUsername = sessionCookieValue.split(":")[1];
    console.log(`getSession: Found 'env_admin:' prefixed cookie. Username from cookie: '${cookieUsername}'`);

    const runtimeEnvAdminUsername = process.env.ADMIN_USERNAME;
    console.log(`getSession: Runtime process.env.ADMIN_USERNAME for env_admin check: '${runtimeEnvAdminUsername}'`);

    if (runtimeEnvAdminUsername && cookieUsername === runtimeEnvAdminUsername) {
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
      console.warn(`getSession: env_admin cookie validation FAILED. Cookie username: '${cookieUsername}', Runtime env username: '${runtimeEnvAdminUsername}'. This could be due to process.env.ADMIN_USERNAME not being available/mismatching at this execution. Clearing cookie.`);
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }
  }

  if (sessionCookieValue.startsWith("user_id:")) {
    const userId = sessionCookieValue.split(":")[1];
    console.log(`getSession: Found 'user_id:' prefixed cookie. User ID from cookie: '${userId}'`);
    if (!userId) {
        console.warn("getSession: Invalid user_id cookie - no user ID found after colon. Clearing cookie.");
        cookieStore.delete(SESSION_COOKIE_NAME);
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
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;

    } catch (e: any) {
        console.error(`getSession: Error fetching session details for user ID '${userId}':`, e.message, e.stack, "Clearing cookie.");
        cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
  }

  console.warn(`getSession: Cookie format invalid or unhandled. Cookie value: '${sessionCookieValue}'. Clearing cookie.`);
  cookieStore.delete(SESSION_COOKIE_NAME);
  return null;
}
