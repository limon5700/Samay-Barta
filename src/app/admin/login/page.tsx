
"use client";

import { useState, type FormEvent } from "react";
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
      const result = await loginAction(formData);
      console.log('LoginPage: loginAction raw result:', result);

      if (result.success && result.redirectPath) {
        console.log(`LoginPage: loginAction returned success, attempting client-side redirect to: ${result.redirectPath}`);
        router.push(result.redirectPath);
        // No need to setIsLoading(false) here as the page will navigate away
        return;
      } else {
        console.error('LoginPage: loginAction returned error or unexpected response:', result.error);
        setError(result.error || "An unknown login error occurred.");
      }
    } catch (err: any) {
      console.error('LoginPage: handleSubmit caught an error:', err);
      let displayError = "An unexpected issue occurred with login. Please try again.";
      if (err.digest?.startsWith('NEXT_REDIRECT')) {
        // This is an expected error when server action uses redirect()
        // Navigation should be handled by Next.js automatically
        console.log("LoginPage: NEXT_REDIRECT signal caught, navigation should be handled by Next.js.");
        // setIsLoading(false) might not be necessary if navigation happens immediately
        // but good to reset if redirect somehow fails client-side.
      } else {
         displayError = err.message || displayError;
      }
      setError(displayError);
    } finally {
      // Only set isLoading to false if not a NEXT_REDIRECT error,
      // as redirect implies navigation away from this page.
      if (!(error instanceof Error && (error as any).digest?.startsWith('NEXT_REDIRECT'))) {
         setIsLoading(false);
      }
    }
  };

  const handleCheckServerVars = async () => {
    setIsCheckingVars(true);
    setServerVars(null); // Clear previous results
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
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
