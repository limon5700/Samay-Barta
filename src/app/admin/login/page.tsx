
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to the dashboard since login is disabled
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Samay Barta Lite - Admin</CardTitle>
          <CardDescription>Redirecting to dashboard...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-6 py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Please wait while we take you to the admin panel.</p>
        </CardContent>
      </Card>
    </div>
  );
}
