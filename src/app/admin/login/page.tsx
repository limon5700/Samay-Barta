
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, LogIn, Loader2, ShieldCheck } from "lucide-react";
import { loginAction, checkServerVarsAction } from "@/app/admin/auth/actions"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter(); // Not strictly needed if redirect() works, but good for fallback
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverVars, setServerVars] = useState<Record<string, string | boolean> | null>(null);
  const [isCheckingVars, setIsCheckingVars] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setServerVars(null); 
    setIsLoading(true);
    console.log("LoginPage: handleSubmit invoked for user:", username);
    let caughtError: any = null; 

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      
      // loginAction will now attempt to redirect server-side.
      // If it succeeds, it throws NEXT_REDIRECT which is caught below.
      // If it fails (e.g., bad credentials), it returns an error object.
      const result = await loginAction(formData);

      // This block should ideally only be reached if loginAction returns an error object
      // because a successful loginAction should have redirected via throwing NEXT_REDIRECT.
      if (result?.error) {
        console.error("LoginPage: Login failed. Error from loginAction:", result.error);
        setError(result.error);
      } else if (result?.success && result.redirectPath) {
        // This is a fallback if redirect() in server action didn't throw NEXT_REDIRECT
        // or if loginAction was changed back to return redirectPath.
        console.warn("LoginPage: loginAction returned success with redirectPath, but NEXT_REDIRECT was not thrown. Attempting client-side redirect to:", result.redirectPath);
        router.push(result.redirectPath);
      } else if (result?.success && !result.redirectPath) {
         console.error("LoginPage: loginAction returned success but no redirectPath. This is unexpected when server-side redirect is used.");
         setError("Login succeeded but redirection failed. Please contact support.");
      } else if (!result?.success && !result?.error) {
        console.error("LoginPage: Login failed with an unexpected response format from loginAction (no success/error fields):", result);
        setError("Login failed. Please check credentials or server logs.");
      }

    } catch (err: any) {
      caughtError = err; 
      console.error("LoginPage: handleSubmit caught an error during loginAction call:", err);
      console.error("LoginPage: Error name:", err.name);
      console.error("LoginPage: Error message:", err.message);
      console.error("LoginPage: Error stack:", err.stack);
      console.error("LoginPage: Error cause:", err.cause); // Log the cause if present
      console.error("LoginPage: Error digest (if any):", err.digest);

      if (err.digest?.startsWith('NEXT_REDIRECT')) {
          console.log("LoginPage: NEXT_REDIRECT signal caught, navigation should be handled by Next.js. This is an expected part of the redirect process.");
          // For NEXT_REDIRECT, we don't set an error and don't setIsLoading(false) yet,
          // as the page should unmount due to the redirect.
      } else {
          let displayError = "An unexpected error occurred during login. Please try again.";
          if (err.message) {
             displayError = `Login failed: ${err.message}`; // More direct error message
          }
          // The "Failed to fetch" case is often a server crash before it can respond
          if (err.message?.toLowerCase().includes('failed to fetch')) {
            displayError = "Failed to connect to the server for login. This can happen if server-side environment variables (like MONGODB_URI, ADMIN_USERNAME, ADMIN_PASSWORD) are missing or incorrect, causing the server action to crash. Please check your Vercel environment variables and server logs.";
          }
          setError(displayError);
      }
    } finally {
      // Only set isLoading to false if it wasn't a NEXT_REDIRECT error
      // because NEXT_REDIRECT implies the component will unmount.
      const isNextRedirectError = caughtError && caughtError.digest?.startsWith('NEXT_REDIRECT');
      if (!isNextRedirectError) {
          setIsLoading(false);
      }
    }
  };

  const handleCheckServerVars = async () => {
    setIsCheckingVars(true);
    setError(null);
    try {
      const vars = await checkServerVarsAction();
      setServerVars(vars);
    } catch (e: any) {
      setError(`Failed to check server variables: ${e.message}`);
      setServerVars(null);
    } finally {
      setIsCheckingVars(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {serverVars && (
              <Alert variant="default" className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">Server Configuration Status</AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs space-y-1">
                  <p>MONGODB_URI_IS_SET: <strong>{serverVars.MONGODB_URI_IS_SET ? "Yes" : "No - CRITICAL"}</strong></p>
                  <p>ADMIN_USERNAME_IS_SET: <strong>{serverVars.ADMIN_USERNAME_IS_SET ? "Yes" : "No - CRITICAL"}</strong></p>
                  {serverVars.ADMIN_USERNAME_IS_SET && <p>ADMIN_USERNAME_VALUE: <strong>{String(serverVars.ADMIN_USERNAME_VALUE)}</strong></p>}
                  <p>ADMIN_PASSWORD_IS_SET: <strong>{serverVars.ADMIN_PASSWORD_IS_SET ? "Yes" : "No - CRITICAL"}</strong></p>
                  <p>GEMINI_API_KEY_IS_SET: <strong>{serverVars.GEMINI_API_KEY_IS_SET ? "Yes" : "No - AI features will fail"}</strong></p>
                  <p>NODE_ENV: <strong>{String(serverVars.NODE_ENV)}</strong></p>
                  <p>VERCEL_ENV: <strong>{String(serverVars.VERCEL_ENV)}</strong></p>
                  {(!serverVars.MONGODB_URI_IS_SET || !serverVars.ADMIN_USERNAME_IS_SET || !serverVars.ADMIN_PASSWORD_IS_SET) && (
                    <p className="font-bold text-destructive mt-2">One or more critical environment variables are NOT SET on the server. Please set them in your Vercel project settings and redeploy.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full gap-2" disabled={isLoading || isCheckingVars}>
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              {isLoading ? "Logging In..." : "Login"}
            </Button>
            <Button type="button" variant="outline" className="w-full gap-2" onClick={handleCheckServerVars} disabled={isLoading || isCheckingVars}>
              {isCheckingVars ? <Loader2 className="animate-spin h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              {isCheckingVars ? "Checking..." : "Check Server Configuration"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    