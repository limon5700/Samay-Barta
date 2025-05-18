
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
  const router = useRouter(); // Keep for potential future use, though redirect is now server-side
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

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      // loginAction will now handle the redirect itself upon success or throw an error
      // which might include NEXT_REDIRECT.
      const result = await loginAction(formData);

      // This block will only be reached if loginAction returns an error object
      // instead of redirecting or throwing NEXT_REDIRECT.
      if (result?.error) {
        console.error("LoginPage: Login failed. Error from loginAction:", result.error);
        setError(result.error);
      } else if (result?.success === false) {
        // Handle cases where success is explicitly false but no specific error message was given.
        console.error("LoginPage: Login attempt was unsuccessful, but no specific error was returned.");
        setError("Login failed. Please check your credentials.");
      } else if (result?.success === true && !result.redirectPath) {
        // This case should ideally not happen if loginAction always redirects on success
        console.error("LoginPage: loginAction returned success but no redirectPath and did not redirect server-side. This is unexpected.");
        setError("Login succeeded but redirection failed. Please contact support.");
      }
      // If loginAction redirects successfully, this part of the code in handleSubmit
      // will likely not execute as the browser navigates away.
      // If it throws NEXT_REDIRECT, the catch block handles it.

    } catch (err: any) {
      console.error("LoginPage: handleSubmit caught an error during loginAction call or client-side processing:", err);
      console.error("LoginPage: Error name:", err.name);
      console.error("LoginPage: Error message:", err.message);
      console.error("LoginPage: Error stack:", err.stack);
      console.error("LoginPage: Error cause:", err.cause);
      console.error("LoginPage: Error digest (if any):", err.digest);

      if (err.digest?.startsWith('NEXT_REDIRECT')) {
          console.log("LoginPage: NEXT_REDIRECT signal caught, navigation should be handled by Next.js.");
          // No need to setError or setIsLoading(false) here, browser will navigate.
          // The component will unmount.
          return; // Explicitly return to avoid further processing in this catch block.
      } else {
          let displayError = "An unexpected issue occurred with login. Please try again.";
          if (err.message) {
             displayError = `Login failed: ${err.message}`;
          }
          if (err.message?.toLowerCase().includes('failed to fetch')) {
            displayError = "Failed to connect to the server for login. This can happen if server-side environment variables (like MONGODB_URI, ADMIN_USERNAME, ADMIN_PASSWORD) are missing or incorrect, causing the server action to crash. Please check your Vercel environment variables and server logs.";
          }
          setError(displayError);
      }
    } finally {
        // Only set isLoading to false if it's not a NEXT_REDIRECT situation
        // (because if it is, the component will unmount anyway).
        // However, to be safe, especially if the redirect logic changes,
        // we can conditionally set it.
        // A simple way: if an error was set, it means we didn't redirect.
        if (error || (event.target && !event.defaultPrevented)) { // Check if error was set or if redirect didn't happen
             setIsLoading(false);
        }
        // A more robust check would be to see if the NEXT_REDIRECT was caught.
        // This is handled by the return in the catch block for NEXT_REDIRECT.
        // So, if we reach here and NEXT_REDIRECT wasn't caught, we should set isLoading to false.
        // To simplify, let's always set it here if not a NEXT_REDIRECT
        if (!(typeof error === 'object' && error !== null && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT'))) {
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
              {isCheckingRVars ? <Loader2 className="animate-spin h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              {isCheckingVars ? "Checking..." : "Check Server Configuration"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
