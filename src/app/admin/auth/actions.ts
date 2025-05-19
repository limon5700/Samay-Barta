
'use server';

// Removed loginAction, logoutAction, getSession, and auth-specific env var checks.
// Kept checkServerVarsAction as it's a general utility.

// checkServerVarsAction remains for general server configuration checking
export async function checkServerVarsAction(): Promise<Record<string, string | boolean>> {
    "use server";
    console.log("checkServerVarsAction: Invoked from client.");
    const vars = {
        MONGODB_URI_IS_SET: !!process.env.MONGODB_URI,
        ADMIN_USERNAME_IS_SET: !!process.env.ADMIN_USERNAME, // Still useful to check if it was set for other purposes
        ADMIN_USERNAME_VALUE: process.env.ADMIN_USERNAME || "NOT SET (Auth Disabled)",
        ADMIN_PASSWORD_IS_SET: !!process.env.ADMIN_PASSWORD, // Still useful to check
        GEMINI_API_KEY_IS_SET: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY,
        NODE_ENV: process.env.NODE_ENV || "NOT SET",
        VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET (Likely local or not on Vercel)",
    };
    console.log("checkServerVarsAction: Current server environment variables status (auth disabled):", vars);
    return vars;
}
