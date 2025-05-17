
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

  // Always read directly from process.env inside the action
  const currentEnvAdminUsername = process.env.ADMIN_USERNAME;
  const currentEnvAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentEnvAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentEnvAdminPassword ? 'set (length: ' + currentEnvAdminPassword.length + ')' : 'NOT SET'}`);

  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    console.log(`loginAction: Attempting login for username: '${username}'`);

    if (!currentEnvAdminUsername || !currentEnvAdminPassword) {
        console.error("loginAction: CRITICAL - ADMIN_USERNAME or ADMIN_PASSWORD is not set in the server environment at runtime. Cannot perform .env admin login.");
        // Fall through to DB check, but this indicates a config issue.
    } else {
        if (username === currentEnvAdminUsername && password === currentEnvAdminPassword) {
            cookies().set(SESSION_COOKIE_NAME, "env_admin:" + currentEnvAdminUsername, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/", // Explicitly set path to root
            sameSite: "lax", // Lax is generally good for session cookies
            });
            console.log("loginAction: Admin login via .env credentials SUCCESSFUL for user:", username);
            // Return success and redirectPath for client-side navigation
            return { success: true, redirectPath: "/admin/dashboard" };
        } else {
            console.log("loginAction: Admin login via .env credentials FAILED - username/password mismatch.");
            console.log(`loginAction: Provided username: '${username}', Runtime .env username: '${currentEnvAdminUsername}'`);
            // Avoid logging passwords directly or indirectly if possible
            console.log(`loginAction: Provided password was ${password ? 'set' : 'NOT set'}. Runtime .env password was ${currentEnvAdminPassword ? 'set' : 'NOT set'}.`);
        }
    }

    // Attempt database user login if .env admin login failed or wasn't applicable
    console.log("loginAction: Attempting database user login for:", username);
    const user = await getUserByUsername(username);

    if (user && user.isActive) {
      console.log(`loginAction: Database user '${username}' found and is active.`);
      // IMPORTANT: In a real app, use bcrypt.compare(password, user.passwordHash)
      const passwordMatch = password === user.passwordHash; 

      if (passwordMatch) {
        console.log("loginAction: Database user password MATCH for:", username);
        cookies().set(SESSION_COOKIE_NAME, `user_id:${user.id}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/", // Explicitly set path to root
          sameSite: "lax",
        });
        console.log("loginAction: Database user session cookie set for user_id:", user.id);
        // Return success and redirectPath for client-side navigation
        return { success: true, redirectPath: "/admin/dashboard" };
      } else {
        console.log("loginAction: Database user password MISMATCH for:", username);
      }
    } else if (user && !user.isActive) {
      console.log(`loginAction: Database user '${username}' found but is INACTIVE.`);
    } else {
      console.log(`loginAction: Database user '${username}' NOT FOUND.`);
    }
    
    // If all attempts failed
    console.log("loginAction: All login attempts FAILED for username:", username);
    return { success: false, error: "Invalid username or password." };

  } catch (e: any) {
    // This catch is for unexpected errors during the login process itself.
    // It should NOT catch NEXT_REDIRECT if redirect() is not called from within this try block.
    if (typeof e.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT')) {
      // This case should ideally not be hit if this function strictly returns objects for success/failure.
      // If redirect() was called unexpectedly from a nested function, it would be caught here.
      console.error("loginAction: Unexpected NEXT_REDIRECT error caught. This action should return an object, not redirect directly.", e.message);
      throw e; 
    }
    console.error("loginAction: UNEXPECTED CRITICAL ERROR during loginAction execution:", e.message, e.stack);
    return { success: false, error: `An unexpected server error occurred. Please check server logs. Details: ${e.message}` };
  }
}

export async function logoutAction() {
  console.log("logoutAction: Deleting session cookie and redirecting to /admin/login.");
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/admin/login"); // redirect() is appropriate here as it's a direct navigation.
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  const sessionCookieValue = sessionCookie?.value;

  console.log(`getSession: Raw cookie value for ${SESSION_COOKIE_NAME}: '${sessionCookieValue}'`);

  if (!sessionCookieValue) {
    console.log("getSession: No session cookie found (value is primitive undefined).");
    return null;
  }
  
  // Explicitly check for the string 'undefined' which was seen in logs
  if (sessionCookieValue === 'undefined') {
    console.log("getSession: Session cookie value is the literal string 'undefined'. Treating as no session.");
    // Optionally delete the problematic cookie
    // cookieStore.delete(SESSION_COOKIE_NAME);
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
      console.warn(`getSession: env_admin cookie validation FAILED. Cookie username: '${cookieUsername}', Runtime env username: '${runtimeEnvAdminUsername}'. This could be due to process.env.ADMIN_USERNAME not being available/mismatching. Clearing cookie.`);
      cookieStore.delete(SESSION_COOKIE_NAME); // Important: clear invalid cookie
      return null;
    }
  }

  if (sessionCookieValue.startsWith("user_id:")) {
    const userId = sessionCookieValue.split(":")[1];
    console.log(`getSession: Found 'user_id:' prefixed cookie. User ID from cookie: '${userId}'`);
    if (!userId) { // Check if userId is actually present
        console.warn("getSession: Invalid user_id cookie - no user ID found after colon. Clearing cookie.");
        cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }

    try {
      console.log(`getSession: Attempting to fetch database user by ID: '${userId}'`);
      const user = await getUserById(userId); // This function should handle ObjectId conversion and errors
      if (user && user.isActive) {
        console.log(`getSession: Database user '${user.username}' (ID: ${userId}) found and is active. Fetching permissions.`);
        const permissions = await getPermissionsForUser(user.id);
        const roleNames = [];
        if (user.roles) { // Ensure user.roles exists and is an array
          console.log(`getSession: User roles IDs: ${user.roles.join(', ')}. Fetching role names.`);
          for (const roleId of user.roles) {
              const role = await getRoleById(roleId); // Ensure getRoleById is robust
              if (role) {
                roleNames.push(role.name);
              } else {
                console.warn(`getSession: Role with ID '${roleId}' not found for user '${user.username}'.`);
              }
          }
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
      // If user not found or not active
      if (!user) console.warn(`getSession: User with ID '${userId}' not found in database. Clearing cookie.`);
      if (user && !user.isActive) console.warn(`getSession: User '${user.username}' (ID: ${userId}) is inactive. Clearing cookie.`);
      cookieStore.delete(SESSION_COOKIE_NAME); // Clear cookie if user invalid or inactive
      return null;
      
    } catch (e: any) {
        console.error(`getSession: Error fetching session details for user ID '${userId}':`, e.message, e.stack, "Clearing cookie.");
        cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
    }
  }
  
  // If cookie format is invalid or unhandled
  console.warn(`getSession: Cookie format invalid or unhandled. Cookie value: '${sessionCookieValue}'. Clearing cookie.`);
  cookieStore.delete(SESSION_COOKIE_NAME);
  return null;
}
