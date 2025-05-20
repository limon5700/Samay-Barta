
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction } from "@/app/admin/auth/actions";
import type { LoginFormData } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkServerVarsAction } from "@/app/admin/auth/actions";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverConfigError, setServerConfigError] = useState<string | null>(null);
  const [serverVars, setServerVars] = useState<Record<string, string | boolean> | null>(null);
  const [isCheckingVars, setIsCheckingVars] = useState(false);

  useEffect(() => {
    const configErrorParam = searchParams.get('configError');
    if (configErrorParam) {
        setServerConfigError(decodeURIComponent(configErrorParam));
    }
  }, [searchParams]);

  const handleCheckServerVars = async () => {
    setIsCheckingVars(true);
    setError(null);
    setServerConfigError(null);
    try {
        const vars = await checkServerVarsAction();
        setServerVars(vars);
    } catch (e: any) {
        setError("Failed to check server configuration: " + e.message);
        setServerVars(null);
    } finally {
        setIsCheckingVars(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setServerConfigError(null); // Clear server config error on new login attempt
    console.log("LoginPage: handleSubmit invoked for user:", formData.username);

    try {
      // loginAction will throw NEXT_REDIRECT on success, which is handled by Next.js
      // If it returns, it means there was an error or it's an unexpected flow.
      const result = await loginAction(formData);
      
      console.log("LoginPage: loginAction raw result:", result);

      if (result && !result.success && result.error) {
        console.error("LoginPage: loginAction returned error:", result.error);
        setError(result.error);
      } else if (result && result.success && !result.redirectPath) {
        // This case indicates an issue if loginAction is supposed to redirect via NEXT_REDIRECT
        // but instead returns a success object without a path.
        console.warn("LoginPage: loginAction returned success but no redirectPath and didn't throw NEXT_REDIRECT.");
        setError("Login successful, but redirection signal was missing. Please try again or check server logs.");
      } else if (!result) {
        // This case indicates a more severe server-side issue where action didn't return.
        console.error("LoginPage: loginAction returned no result. This indicates a server-side crash or communication failure.");
        setError("Login failed due to a server communication issue. Please check server logs or try again later.");
      }
      // If loginAction throws NEXT_REDIRECT, it will be caught below.
      // If it doesn't throw and doesn't return success, it implies an error handled above.
      setIsLoading(false);

    } catch (err: any) {
      console.log("LoginPage: handleSubmit caught an error object:", err);
      console.log("LoginPage: Error name:", err.name);
      console.log("LoginPage: Error message:", err.message);
      console.log("LoginPage: Error stack:", err.stack);
      console.log("LoginPage: Error cause:", err.cause);
      console.log("LoginPage: Error digest (if any):", err.digest);

      if (err.digest?.startsWith('NEXT_REDIRECT')) {
        console.log("LoginPage: NEXT_REDIRECT signal caught, navigation should be handled by Next.js.");
        // Next.js handles the redirect, no client-side action needed here.
        // setIsLoading(false) will be problematic as the component might unmount.
        return; // Exit early as redirect is in progress
      } else {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during login.";
        setError(`Login failed: ${errorMessage}`);
        setIsLoading(false);
      }
    } 
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Samay Barta Lite - Admin</CardTitle>
          <CardDescription>Please enter your credentials to access the admin panel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {serverConfigError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Server Configuration Issue</AlertTitle>
              <AlertDescription>{serverConfigError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin_username"
                value={formData.username}
                onChange={handleChange}
                required
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-input"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-6">
            <Button variant="outline" className="w-full" onClick={handleCheckServerVars} disabled={isCheckingVars}>
                {isCheckingVars ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Check Server Configuration
            </Button>
            {serverVars && (
                <Card className="mt-4 text-sm">
                    <CardHeader><CardTitle className="text-base">Server Configuration Status:</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                        <p><strong>MONGODB_URI is set:</strong> {serverVars.MONGODB_URI_IS_SET ? "Yes" : <span className="text-destructive font-semibold">No (CRITICAL)</span>}</p>
                        <p><strong>ADMIN_USERNAME is set:</strong> {serverVars.ADMIN_USERNAME_IS_SET ? "Yes" : <span className="text-destructive font-semibold">No (CRITICAL)</span>}</p>
                        <p><strong>ADMIN_USERNAME value:</strong> {String(serverVars.ADMIN_USERNAME_VALUE)}</p>
                        <p><strong>ADMIN_PASSWORD is set:</strong> {serverVars.ADMIN_PASSWORD_IS_SET ? "Yes" : <span className="text-destructive font-semibold">No (CRITICAL)</span>}</p>
                        <p><strong>GEMINI_API_KEY is set:</strong> {serverVars.GEMINI_API_KEY_IS_SET ? "Yes" : "No (Optional for some features)"}</p>
                        <p><strong>NODE_ENV:</strong> {String(serverVars.NODE_ENV)}</p>
                        <p><strong>VERCEL_ENV:</strong> {String(serverVars.VERCEL_ENV)}</p>
                    </CardContent>
                </Card>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
           © {new Date().getFullYear()} Samay Barta Lite
        </CardFooter>
      </Card>
    </div>
  );
}
