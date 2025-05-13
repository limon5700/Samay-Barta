

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

if (!ENV_ADMIN_USERNAME || !ENV_ADMIN_PASSWORD) {
  console.warn(
    "Warning: ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set. Fallback admin login will not function."
  );
}

export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // 1. Try .env admin credentials first (if configured)
  if (ENV_ADMIN_USERNAME && ENV_ADMIN_PASSWORD && username === ENV_ADMIN_USERNAME && password === ENV_ADMIN_PASSWORD) {
    cookies().set(SESSION_COOKIE_NAME, "env_admin:" + ENV_ADMIN_USERNAME, { // Store a special identifier for env admin
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: "lax",
    });
    return { success: true };
  }

  // 2. Try database user
  const user = await getUserByUsername(username);

  if (user && user.isActive) {
    // In a real app, compare hashed passwords:
    // const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    // For simplicity, direct comparison (INSECURE FOR PRODUCTION):
    const passwordMatch = password === user.passwordHash; 

    if (passwordMatch) {
      cookies().set(SESSION_COOKIE_NAME, `user_id:${user.id}`, { // Store user ID
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax",
      });
      return { success: true };
    }
  }
  
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
    if (username === ENV_ADMIN_USERNAME) {
        // For .env admin, grant all permissions conceptually.
        // In a real scenario, you might have a predefined list of all possible permissions.
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
    return null; // Invalid env_admin cookie
  }

  if (sessionCookieValue.startsWith("user_id:")) {
    const userId = sessionCookieValue.split(":")[1];
    if (!userId) return null;

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
    // User not found or inactive, clear cookie
    cookies().delete(SESSION_COOKIE_NAME);
    return null;
  }
  
  // Invalid cookie format
  cookies().delete(SESSION_COOKIE_NAME);
  return null;
}
