
"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const { getUIText, isClient } = useAppContext();
  const router = useRouter();

    if (!isClient) {
    // Simple loading state or placeholder for SSR
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
         {/* Minimal header without dynamic text for SSR */}
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="text-3xl font-bold text-primary">Loading...</div>
            </div>
        </header>
        <main className="flex-grow container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Loading...</h1>
            <p>Loading content...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header onSearch={(term) => router.push(`/?search=${term}`)} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">{getUIText("termsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 prose dark:prose-invert max-w-none">
            <div>
              <h3 className="font-semibold text-lg">{getUIText("termsSection1Title") || "1. Acceptance of Terms"}</h3>
              <p>{getUIText("termsSection1Content") || "By accessing or using Samay Barta Lite (the \"Service\"), you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, then you may not access the Service."}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{getUIText("termsSection2Title") || "2. Use of Service"}</h3>
              <p>{getUIText("termsSection2Content") || "The Service provides news summaries and translations. You agree to use the Service for lawful purposes only and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the Service. Content provided is for informational purposes and accuracy is not guaranteed for AI-generated translations or summaries."}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{getUIText("termsSection3Title") || "3. AI Generated Content"}</h3>
              <p>{getUIText("termsSection3Content") || "The Service utilizes artificial intelligence for content generation, including summaries and translations. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You acknowledge that reliance on such content is at your own risk."}</p>
            </div>
             <div>
              <h3 className="font-semibold text-lg">{getUIText("termsSection4Title") || "4. Modifications to Terms"}</h3>
              <p>{getUIText("termsSection4Content") || "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion."}</p>
            </div>
             <div>
              <h3 className="font-semibold text-lg">{getUIText("termsSection5Title") || "5. Contact Us"}</h3>
              <p>{getUIText("termsSection5Content") || "If you have any questions about these Terms, please contact us."}</p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
