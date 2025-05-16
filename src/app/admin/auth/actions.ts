
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { getUserByUsername, getUserById, getPermissionsForUser, getRoleById } from "@/lib/data"; // Import user data functions
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

export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  console.log("loginAction: Invoked.");

  // Directly access process.env inside the function for up-to-date values
  const currentEnvAdminUsername = process.env.ADMIN_USERNAME;
  const currentEnvAdminPassword = process.env.ADMIN_PASSWORD;

  // Log the values as seen by this server action at runtime
  console.log(`loginAction: Runtime process.env.ADMIN_USERNAME: '${currentEnvAdminUsername}'`);
  console.log(`loginAction: Runtime process.env.ADMIN_PASSWORD is ${currentEnvAdminPassword ? 'set (length: ' + currentEnvAdminPassword.length + ')' : 'NOT SET'}`);

  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    console.log(`loginAction: Attempting login for username: '${username}'`);

    // 1. Try .env admin credentials first (if configured and accessible at runtime)
    if (currentEnvAdminUsername && currentEnvAdminPassword) {
      if (username === currentEnvAdminUsername && password === currentEnvAdminPassword) {
        cookies().set(SESSION_COOKIE_NAME, "env_admin:" + currentEnvAdminUsername, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/",
          sameSite: "lax",
        });
        console.log("loginAction: Admin login via .env credentials SUCCESSFUL for user:", username);
        return { success: true };
      } else {
        console.log("loginAction: Admin login via .env credentials FAILED - username/password mismatch.");
        console.log(`loginAction: Provided username: '${username}', Runtime .env username: '${currentEnvAdminUsername}'`);
        // Avoid logging passwords directly, but confirm if they were set
        console.log(`loginAction: Provided password was ${password ? 'set' : 'NOT set'}. Runtime .env password was ${currentEnvAdminPassword ? 'set' : 'NOT set'}.`);
      }
    } else {
        console.error("loginAction: Admin login via .env credentials SKIPPED - process.env.ADMIN_USERNAME or process.env.ADMIN_PASSWORD is not set or falsy at runtime within loginAction.");
    }

    // 2. Try database user
    console.log("loginAction: Attempting database user login for:", username);
    const user = await getUserByUsername(username);

    if (user && user.isActive) {
      console.log(`loginAction: Database user '${username}' found and is active.`);
      // In a real app, compare hashed passwords:
      // const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      // For simplicity, direct comparison (INSECURE FOR PRODUCTION):
      const passwordMatch = password === user.passwordHash; 

      if (passwordMatch) {
        console.log("loginAction: Database user password MATCH for:", username);
        cookies().set(SESSION_COOKIE_NAME, `user_id:${user.id}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/",
          sameSite: "lax",
        });
        return { success: true };
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
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

export async function getSession(): Promise<UserSession | null> {
  const sessionCookieValue = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookieValue) return null;

  const envAdminUser = process.env.ADMIN_USERNAME; // Use current process.env value

  if (sessionCookieValue.startsWith("env_admin:")) {
    const username = sessionCookieValue.split(":")[1];
    if (envAdminUser && username === envAdminUser) { // Check against current ENV_ADMIN_USERNAME
        const allPermissions: Permission[] = [
            'manage_articles', 'publish_articles', 'manage_users', 'manage_roles', 
            'manage_layout_gadgets', 'manage_seo_global', 'manage_settings', 'view_admin_dashboard'
        ];
        return {
            username: envAdminUser,
            roles: ["SuperAdmin (ENV)"],
            permissions: allPermissions,
            isEnvAdmin: true,
            isAuthenticated: true,
        };
    }
    console.warn("getSession: Invalid env_admin cookie - username mismatch or process.env.ADMIN_USERNAME not set at runtime.");
    cookies().delete(SESSION_COOKIE_NAME); // Clear invalid cookie
    return null;
  }

  if (sessionCookieValue.startsWith("user_id:")) {
    const userId = sessionCookieValue.split(":")[1];
    if (!userId) {
        console.warn("getSession: Invalid user_id cookie - no user ID found after colon.");
        cookies().delete(SESSION_COOKIE_NAME);
        return null;
    }

    try {
      const user = await getUserById(userId);
      if (user && user.isActive) {
        const permissions = await getPermissionsForUser(user.id);
        const roleNames = [];
        if (user.roles) {
          for (const roleId of user.roles) {
              const role = await getRoleById(roleId);
              if (role) roleNames.push(role.name);
          }
        }

        return {
          userId: user.id,
          username: user.username,
          roles: roleNames,
          permissions,
          isEnvAdmin: false,
          isAuthenticated: true,
        };
      }
      // User not found or inactive
      if (!user) console.warn(`getSession: User with ID '${userId}' not found.`);
      if (user && !user.isActive) console.warn(`getSession: User '${user.username}' is inactive.`);
      
    } catch (e: any) {
        console.error("getSession: Error fetching session details for user ID:", userId, e.message, e.stack);
        cookies().delete(SESSION_COOKIE_NAME); // Clear cookie on error
        return null;
    }
    // If user not found or inactive after try block, clear cookie
    cookies().delete(SESSION_COOKIE_NAME);
    return null;
  }
  
  console.warn("getSession: Invalid session cookie format:", sessionCookieValue);
  cookies().delete(SESSION_COOKIE_NAME); // Clear invalid cookie
  return null;
}
