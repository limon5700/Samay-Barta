
"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation"; // Using next/navigation for App Router

export default function FAQPage() {
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
            <CardTitle className="text-2xl font-bold text-primary">{getUIText("faqTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 prose dark:prose-invert max-w-none">
            <div>
              <h3 className="font-semibold text-lg">{getUIText("faqQ1Title") || "Q1: What is Samay Barta Lite?"}</h3>
              <p>{getUIText("faqA1Content") || "Samay Barta Lite is a concise news application that uses AI to provide you with quick summaries and translations of news articles."}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{getUIText("faqQ2Title") || "Q2: How do I change the language?"}</h3>
              <p>{getUIText("faqA2Content") || "You can change the language using the language switcher option available in the three-dot menu in the header."}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{getUIText("faqQ3Title") || "Q3: How does the dark mode work?"}</h3>
              <p>{getUIText("faqA3Content") || "Dark mode can be toggled from the theme switcher in the three-dot menu. It changes the application's appearance to a darker color scheme, which can be easier on the eyes in low-light environments."}</p>
            </div>
             <div>
              <h3 className="font-semibold text-lg">{getUIText("faqQ4Title") || "Q4: Is the content translated by AI?"}</h3>
              <p>{getUIText("faqA4Content") || "Yes, the article translation feature uses Generative AI to translate content into your selected language."}</p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
