
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction, checkServerVarsAction } from "@/app/admin/auth/actions";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverVars, setServerVars] = useState<Record<string, string | boolean> | null>(null);
  const [isCheckingVars, setIsCheckingVars] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const username = formData.get('username') as string;
    console.log(`LoginPage: handleSubmit invoked for user: ${username}`);

    try {
      // loginAction will now directly redirect on success or throw other errors
      await loginAction(formData);
      // If loginAction successfully redirects, this part of the code might not be reached
      // or might be interrupted by the redirect.
      // However, if it returns an error object (which it shouldn't if redirecting), handle it.
      // For safety, we assume it might return an error object if redirect fails.
      console.warn('LoginPage: loginAction completed without throwing NEXT_REDIRECT or another error. This path should ideally not be reached if login and redirect were successful.');
      // No explicit client-side redirect needed here if loginAction handles it.
      
    } catch (err: any) {
      console.error('LoginPage: handleSubmit caught an error:', err);
      console.log('LoginPage: Error name:', err.name);
      console.log('LoginPage: Error message:', err.message);
      console.log('LoginPage: Error stack:', err.stack);
      console.log('LoginPage: Error cause:', err.cause);
      console.log('LoginPage: Error digest (if any):', err.digest);

      if (err.digest?.startsWith('NEXT_REDIRECT')) {
        // This is an expected error when server action uses redirect()
        // Navigation should be handled by Next.js automatically.
        console.log("LoginPage: NEXT_REDIRECT signal caught, navigation should be handled by Next.js.");
        // setIsLoading(false) is tricky here, as the component might unmount.
        // We let the finally block handle it if it's not a redirect.
        return; // Exit early, Next.js handles the redirect
      } else {
        // Handle other errors that might be returned as { success: false, error: '...' }
        // or actual thrown errors not related to NEXT_REDIRECT.
        const result = err as { success?: boolean; error?: string }; // Type assertion
        if (typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string') {
          setError(result.error);
        } else {
          setError(err.message || "An unexpected login error occurred. Please check server logs.");
        }
      }
    } finally {
      // Only set isLoading to false if not a NEXT_REDIRECT error that's being handled by the browser
      // This check might be redundant if the 'return' in the catch block for NEXT_REDIRECT is hit.
       if (!(error instanceof Error && (error as any).digest?.startsWith('NEXT_REDIRECT'))) {
         setIsLoading(false);
       }
    }
  };

  const handleCheckServerVars = async () => {
    setIsCheckingVars(true);
    setServerVars(null); 
    try {
      const vars = await checkServerVarsAction();
      setServerVars(vars);
    } catch (e) {
      console.error("Error checking server vars:", e);
      setServerVars({ error: "Failed to fetch server variables." });
    } finally {
      setIsCheckingVars(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Samay Barta Lite - Admin</CardTitle>
          <CardDescription>Please log in to access the admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" type="text" placeholder="Enter your username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Enter your password" required />
            </div>
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive dark:text-destructive-foreground">
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
        <CardFooter className="flex flex-col items-center space-y-4 pt-6">
           <p className="text-xs text-muted-foreground">
            Hint: Use credentials from your <code>.env</code> file (<code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code>).
          </p>
          <Button variant="outline" onClick={handleCheckServerVars} disabled={isCheckingVars} size="sm">
            {isCheckingVars ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Check Server Configuration
          </Button>
          {serverVars && (
            <div className="mt-4 p-3 border rounded-md bg-muted/50 text-xs w-full">
              <h4 className="font-semibold mb-1">Server Variables Status:</h4>
              {Object.entries(serverVars).map(([key, value]) => (
                <p key={key}>
                  <span className="font-medium">{key}:</span>{" "}
                  <span className={value === true || (typeof value === 'string' && value !== "NOT SET" && value !== "NOT SET (Likely local or not on Vercel)") ? "text-green-600" : (value === false || value === "NOT SET" || value === "NOT SET (Likely local or not on Vercel)" ? "text-red-600 font-bold" : "")}>
                    {typeof value === 'boolean' ? (value ? "Yes" : "No") : value}
                  </span>
                </p>
              ))}
               {serverVars.error && <p className="text-red-600 font-bold">Error: {serverVars.error}</p>}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
