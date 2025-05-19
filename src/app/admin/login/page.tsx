
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverConfigError, setServerConfigError] = useState<string | null>(null);

  useEffect(() => {
    const configError = searchParams.get('configError');
    if (configError) {
        setServerConfigError(decodeURIComponent(configError));
    }
  }, [searchParams]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setServerConfigError(null);
    console.log("LoginPage: handleSubmit invoked for user:", formData.username);

    try {
      // loginAction will throw NEXT_REDIRECT on success, which is handled by Next.js
      // If it returns, it means there was an error.
      const result = await loginAction(formData);
      
      if (result && !result.success && result.error) {
        console.error("LoginPage: loginAction returned error:", result.error);
        setError(result.error);
      } else if (result && result.success && !result.redirectPath) {
        // This case should ideally not happen if loginAction uses redirect()
        console.warn("LoginPage: loginAction returned success but no redirectPath.");
        setError("Login successful, but redirection failed. Please try again.");
      } else if (!result) {
        // This case indicates a more severe server-side issue where action didn't return.
        console.error("LoginPage: loginAction returned no result. This indicates a server-side crash or communication failure.");
        setError("Login failed due to a server communication issue. Please check server logs or try again later.");
      }
    } catch (err: any) {
      // Catch NEXT_REDIRECT or other errors
      if (err.digest?.startsWith('NEXT_REDIRECT')) {
        console.log("LoginPage: NEXT_REDIRECT signal caught, navigation should be handled by Next.js.");
        // Next.js handles the redirect, no client-side action needed here.
        // setIsLoading(false) will be problematic as the component might unmount.
        return; // Exit early as redirect is in progress
      } else {
        console.error("LoginPage: handleSubmit caught an error:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during login.";
        setError(`Login failed: ${errorMessage}`);
      }
    } finally {
      // Only set isLoading to false if not being redirected.
      // If a redirect is happening, the component will unmount.
      // A more robust way would be to check if the error is NEXT_REDIRECT before setting loading state.
      // For now, a small delay might prevent flicker if redirect is slow, but best to let Next.js handle it.
      if (!error?.includes('NEXT_REDIRECT')) { // A bit of a heuristic
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
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
           © {new Date().getFullYear()} Samay Barta Lite
        </CardFooter>
      </Card>
    </div>
  );
}
