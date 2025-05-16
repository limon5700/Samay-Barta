
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { getUserByUsername, getUserById, getPermissionsForUser, getRoleById } from "@/lib/data"; // Import user data functions
import type { UserSession, Permission } from "@/lib/types";
// For password hashing in a real app:
// import bcrypt from 'bcryptjs';

const ENV_ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// This warning runs when the module is loaded.
if (!ENV_ADMIN_USERNAME || !ENV_ADMIN_PASSWORD) {
  console.warn(
    "Warning (module load): ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set in process.env. Fallback admin login will not function."
  );
} else {
  console.log("Info (module load): ADMIN_USERNAME and ADMIN_PASSWORD appear to be set in process.env.");
}

export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  console.log("loginAction: Invoked.");
  // Log the values of environment variables as seen by this server action
  // Log length for password to avoid exposing it directly in logs.
  console.log(`loginAction: ENV_ADMIN_USERNAME from process.env: '${ENV_ADMIN_USERNAME}'`);
  console.log(`loginAction: ENV_ADMIN_PASSWORD from process.env is ${ENV_ADMIN_PASSWORD ? 'set (length: ' + ENV_ADMIN_PASSWORD.length + ')' : 'NOT SET'}`);

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  console.log(`loginAction: Attempting login for username: '${username}'`);

  // 1. Try .env admin credentials first (if configured)
  if (ENV_ADMIN_USERNAME && ENV_ADMIN_PASSWORD) {
    if (username === ENV_ADMIN_USERNAME && password === ENV_ADMIN_PASSWORD) {
      cookies().set(SESSION_COOKIE_NAME, "env_admin:" + ENV_ADMIN_USERNAME, {
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
      console.log(`loginAction: Provided username: '${username}', .env username: '${ENV_ADMIN_USERNAME}'`);
      // Avoid logging passwords directly, but confirm if they were set
      console.log(`loginAction: Provided password was ${password ? 'set' : 'NOT set'}. .env password was ${ENV_ADMIN_PASSWORD ? 'set' : 'NOT set'}.`);
    }
  } else {
      console.error("loginAction: Admin login via .env credentials SKIPPED - ENV_ADMIN_USERNAME or ENV_ADMIN_PASSWORD is not set or falsy within loginAction.");
  }

  // 2. Try database user
  try {
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
  } catch (e: any) {
    console.error("loginAction: CRITICAL ERROR during database user login attempt:", e.message, e.stack);
    return { success: false, error: "A server error occurred during login. Please check server logs for details." };
  }
  
  console.log("loginAction: All login attempts FAILED for username:", username);
  return { success: false, error: "Invalid username or password." };
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

export async function getSession(): Promise<UserSession | null> {
  const sessionCookieValue = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookieValue) return null;

  if (sessionCookieValue.startsWith("env_admin:")) {
    const username = sessionCookieValue.split(":")[1];
    if (username === ENV_ADMIN_USERNAME) { // Check against current ENV_ADMIN_USERNAME
        const allPermissions: Permission[] = [
            'manage_articles', 'publish_articles', 'manage_users', 'manage_roles', 
            'manage_layout_gadgets', 'manage_seo_global', 'manage_settings', 'view_admin_dashboard'
        ];
        return {
            username: ENV_ADMIN_USERNAME,
            roles: ["SuperAdmin (ENV)"],
            permissions: allPermissions,
            isEnvAdmin: true,
            isAuthenticated: true,
        };
    }
    console.warn("getSession: Invalid env_admin cookie - username mismatch or ENV_ADMIN_USERNAME not set.");
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
