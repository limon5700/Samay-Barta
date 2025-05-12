
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.warn(
    "Warning: ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set. Admin login will not function correctly."
  );
}

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return { success: false, error: "Admin credentials not configured on the server." };
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // In a real app, generate a secure token (e.g., JWT)
    const sessionToken = Buffer.from(`${username}:${password}`).toString('base64'); // Simple token for example
    
    cookies().set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: "lax",
    });
    return { success: true };
  } else {
    return { success: false, error: "Invalid username or password." };
  }
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

export async function getSession() {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  // In a real app, verify the token (e.g., JWT verification)
  // For this example, if the cookie exists, we assume it's valid.
  // This is NOT secure for production.
  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString('ascii');
    const [username] = decoded.split(':');
    if (username === ADMIN_USERNAME) {
         return { isAuthenticated: true, username };
    }
    return null;
  } catch (error) {
    return null; // Invalid token
  }
}
