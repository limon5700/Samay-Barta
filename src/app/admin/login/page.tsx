
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction, checkServerVarsAction } from "@/app/admin/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ServerIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<Record<string, string | boolean> | null>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);

  const handleCheckServerConfig = async () => {
    setIsCheckingConfig(true);
    setError(null);
    try {
      const config = await checkServerVarsAction();
      setServerConfig(config);
    } catch (e: any) {
      console.error("LoginPage: Error checking server config:", e);
      setError("Failed to check server configuration. " + e.message);
      setServerConfig(null);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setServerConfig(null); // Clear previous config check results

    const formData = new FormData(event.currentTarget);
    const username = formData.get('username');
    console.log(`LoginPage: handleSubmit invoked for user: ${username}`);

    try {
      // loginAction will now handle redirect internally if successful
      // by throwing a NEXT_REDIRECT error.
      await loginAction(formData);
      // If loginAction throws NEXT_REDIRECT, this part won't be reached.
      // If it returns (meaning it didn't throw redirect, implying an error was returned by it),
      // then we should handle that error. However, our loginAction is designed to throw redirect on success.
      // This part is more of a fallback.
      console.warn("LoginPage: loginAction completed without throwing NEXT_REDIRECT. This might indicate an issue if login was expected to succeed and redirect.");
      // We might get here if loginAction returned an error object instead of throwing.
      // But for this simple auth, it should throw redirect on success.
      // If it *does* return, assume it's an error not handled by a throw.
      setError("Login attempt completed but did not redirect. Check server logs.");
      setIsLoading(false);

    } catch (err: any) {
      console.error("LoginPage: handleSubmit caught an error:", err);
      if (err.digest?.startsWith('NEXT_REDIRECT')) {
        // This is an expected error when redirect() is called from a server action.
        // Next.js router will handle the navigation.
        console.log("LoginPage: NEXT_REDIRECT signal caught, navigation should be handled by Next.js.");
        // No need to setError or setIsLoading(false) here, as the page will unmount.
        return; // Important to return to prevent further processing
      }
      const errorMessage = err.message || "An unexpected error occurred during login.";
      console.error(`LoginPage: Login failed. Error: ${errorMessage}`, err.stack, err.cause, err.digest);
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Only set isLoading to false if it's not a redirect scenario
      // However, if redirect is thrown, this finally block might run before unmount.
      // It's generally safe to always set it, but the return in the catch block for NEXT_REDIRECT is key.
      if (!error?.includes('NEXT_REDIRECT')) { // Check if error is not NEXT_REDIRECT before setting loading to false
         setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Samay Barta Lite - Admin</CardTitle>
          <CardDescription>Please log in to access the admin dashboard.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" type="text" placeholder="admin" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
            <Button type="button" variant="outline" onClick={handleCheckServerConfig} className="w-full" disabled={isCheckingConfig}>
              {isCheckingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ServerIcon className="mr-2 h-4 w-4" />}
              Check Server Configuration
            </Button>
          </CardFooter>
        </form>
        {serverConfig && (
          <CardContent className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Server Configuration Status:</h4>
            <ul className="text-xs space-y-1">
              {Object.entries(serverConfig).map(([key, value]) => (
                <li key={key} className="flex justify-between">
                  <span className="font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                  <span className={value === true || (typeof value === 'string' && value !== "NOT SET" && !value.includes("NOT SET")) ? "text-green-600" : "text-red-600"}>
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
