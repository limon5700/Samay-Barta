
"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { loginAction } from "@/app/admin/auth/actions"; 

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      
      // loginAction now returns an object like { success: boolean, error?: string, redirectPath?: string }
      const result = await loginAction(formData);

      if (result?.success && result.redirectPath) {
        // If loginAction signals success and provides a redirectPath, navigate client-side
        const redirectUrlFromParams = searchParams.get('redirect');
        router.push(redirectUrlFromParams || result.redirectPath);
      } else if (result?.success) {
        // Fallback if redirectPath is somehow not provided but success is true
        router.push("/admin/dashboard");
      }
      else {
        setError(result?.error || "Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      // Server actions that call redirect() throw an error with digest 'NEXT_REDIRECT'
      // This catch block is important if loginAction still uses redirect() internally for other cases (e.g., logout)
      // or if an unexpected error occurs that isn't NEXT_REDIRECT.
      console.error("Login page handleSubmit error:", err);
      if (err.digest?.startsWith('NEXT_REDIRECT')) {
        // This case should ideally not be hit if loginAction returns success/redirectPath
        // but kept for robustness if redirect() is called directly.
        // The framework should handle the redirect.
        return;
      }
      setError("An unexpected error occurred during login. Please try again. Details: " + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
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
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <LogIn />
              )}
              {isLoading ? "Logging In..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
