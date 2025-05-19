
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants';

// Re-implement a simplified loginAction
export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  console.log("loginAction: Invoked.");

  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const envAdminUsername = process.env.ADMIN_USERNAME;
  const envAdminPassword = process.env.ADMIN_PASSWORD;

  console.log(`loginAction: Attempting login for username: '${username}'`);
  console.log(`loginAction: Server ADMIN_USERNAME: '${envAdminUsername}'`);
  console.log(`loginAction: Server ADMIN_PASSWORD is ${envAdminPassword ? 'set' : 'NOT SET'}`);

  if (!envAdminUsername || !envAdminPassword) {
    console.error("loginAction: Critical - Admin credentials are not configured on the server via .env variables.");
    return { success: false, error: "Admin credentials not configured on the server. Login disabled." };
  }

  if (username === envAdminUsername && password === envAdminPassword) {
    console.log("loginAction: Admin login via .env credentials SUCCESSFUL.");
    const cookieStore = cookies();
    try {
      await cookieStore.set(SESSION_COOKIE_NAME, 'true', { // Simple 'true' value for the cookie
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
      console.log(`loginAction: Cookie '${SESSION_COOKIE_NAME}' should be set.`);
    } catch (e: any) {
        // This catch is important if using `await` with cookies() and it throws
        console.error("loginAction: Error setting cookie:", e.message, e.stack);
        return { success: false, error: `Failed to set session cookie: ${e.message}` };
    }
    // Instead of returning, we redirect. Client needs to handle NEXT_REDIRECT.
    try {
        redirect('/admin/dashboard');
    } catch (error: any) {
        if (error.digest?.startsWith('NEXT_REDIRECT')) {
            console.log("loginAction: Caught NEXT_REDIRECT, re-throwing.");
            throw error; // Re-throw for Next.js to handle client-side
        }
        console.error("loginAction: Error during redirect:", error);
        return { success: false, error: "Login successful, but redirect failed." };
    }
  } else {
    console.warn(`loginAction: Admin login FAILED - credentials mismatch for username: '${username}'`);
    return { success: false, error: 'Invalid username or password.' };
  }
}

// Re-implement a simplified logoutAction
export async function logoutAction() {
  'use server';
  console.log("logoutAction: Invoked.");
  const cookieStore = cookies();
  try {
    await cookieStore.delete(SESSION_COOKIE_NAME);
    console.log(`logoutAction: Cookie '${SESSION_COOKIE_NAME}' deleted.`);
  } catch (e:any) {
    console.error("logoutAction: Error deleting cookie:", e.message, e.stack);
  }
  redirect('/admin/login');
}

// checkServerVarsAction remains for general server configuration checking
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
