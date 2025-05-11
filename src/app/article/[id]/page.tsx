"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Languages, Loader2 } from 'lucide-react';

import type { NewsArticle } from '@/lib/types';
import { sampleNewsArticles } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translateText } from '@/ai/flows/translate-text-flow';
import { useToast } from "@/hooks/use-toast";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

interface LanguageOption {
  value: string;
  label: string;
}

const languageOptions: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'Bengali (বাংলা)' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'pt', label: 'Portuguese (Português)' },
  { value: 'ru', label: 'Russian (Русский)' },
];

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState<string>('bn'); // Default to Bengali
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayContent, setDisplayContent] = useState<string>('');


  useEffect(() => {
    if (id) {
      setIsLoading(true);
      // Simulate fetching article data
      setTimeout(() => {
        const foundArticle = sampleNewsArticles.find(art => art.id === id);
        if (foundArticle) {
          setArticle(foundArticle);
          setDisplayContent(foundArticle.content); 
        } else {
          // Handle article not found, perhaps redirect or show error
          toast({ title: "Error", description: "Article not found.", variant: "destructive" });
          router.push('/'); 
        }
        setIsLoading(false);
      }, 500);
    }
  }, [id, router, toast]);

  const handleTranslate = useCallback(async () => {
    if (!article || !targetLanguage) return;

    setIsTranslating(true);
    setTranslatedContent(null); 
    try {
      const result = await translateText({ text: article.content, targetLanguage });
      setTranslatedContent(result.translatedText);
      setDisplayContent(result.translatedText);
      toast({
        title: "Translation Successful",
        description: `Article translated to ${languageOptions.find(l => l.value === targetLanguage)?.label || targetLanguage}.`,
      });
    } catch (error) {
      console.error("Error translating article:", error);
      toast({
        title: "Translation Failed",
        description: "Could not translate the article. Please try again.",
        variant: "destructive",
      });
      setDisplayContent(article.content); // Revert to original on error
    } finally {
      setIsTranslating(false);
    }
  }, [article, targetLanguage, toast]);

  const handleShowOriginal = () => {
    if (article) {
      setDisplayContent(article.content);
      setTranslatedContent(null); // Clear translation if showing original
      toast({
        title: "Displaying Original",
        description: "Showing the original article content.",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header appName="সময় বার্তা Lite" onSearch={() => {}} />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-24 mb-6 rounded-md" /> {/* Back button skeleton */}
          <Card className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-10 w-3/4 mb-2 rounded-md" /> {/* Title skeleton */}
              <Skeleton className="h-40 w-full rounded-md mb-4" /> {/* Image skeleton */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <Skeleton className="h-6 w-20 rounded-md" /> {/* Badge skeleton */}
                <Skeleton className="h-6 w-32 rounded-md" /> {/* Date skeleton */}
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert">
              <Skeleton className="h-6 w-full mb-2 rounded-md" />
              <Skeleton className="h-6 w-full mb-2 rounded-md" />
              <Skeleton className="h-6 w-5/6 mb-2 rounded-md" />
            </CardContent>
          </Card>
           <div className="mt-6 p-4 border rounded-lg shadow-sm bg-card">
              <Skeleton className="h-8 w-40 mb-4 rounded-md" /> {/* Translator title skeleton */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Skeleton className="h-10 w-full sm:w-48 rounded-md" /> {/* Select skeleton */}
                <Skeleton className="h-10 w-full sm:w-36 rounded-md" /> {/* Translate button skeleton */}
              </div>
            </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    // This case should ideally be handled by redirection in useEffect or a dedicated 404 page
    return (
       <div className="flex flex-col min-h-screen bg-background">
        <Header appName="সময় বার্তা Lite" onSearch={() => {}} />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-2xl text-muted-foreground">Article not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const formattedDate = article.publishedDate ? format(parseISO(article.publishedDate), "MMMM d, yyyy 'at' h:mm a") : "N/A";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header appName="সময় বার্তা Lite" onSearch={(term) => router.push(`/?search=${term}`)} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-6 group">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to News
        </Button>

        <Card className="shadow-xl rounded-xl overflow-hidden">
          {article.imageUrl && (
            <div className="relative w-full h-64 md:h-96">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill={true}
                style={{objectFit:"cover"}}
                priority
                data-ai-hint={article.dataAiHint || "news article detail"}
              />
            </div>
          )}
          <CardHeader className="p-6">
            <CardTitle className="text-3xl md:text-4xl font-bold leading-tight mb-3 text-primary">
              {article.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
              <Badge variant="secondary" className="text-md px-3 py-1">{article.category}</Badge>
              <span>Published: {formattedDate}</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <article className="prose prose-base sm:prose-lg lg:prose-xl max-w-none dark:prose-invert text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </article>
          </CardContent>
        </Card>

        <Card className="mt-8 p-6 shadow-lg rounded-xl">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-primary">
            <Languages className="mr-2 h-6 w-6" />
            Translate Article
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px] text-base py-3">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map(lang => (
                  <SelectItem key={lang.value} value={lang.value} className="text-base py-2">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleTranslate} 
              disabled={isTranslating || !article}
              className="w-full sm:w-auto text-base py-3 px-6"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Translating...
                </>
              ) : (
                "Translate Content"
              )}
            </Button>
             {translatedContent && (
                <Button 
                  onClick={handleShowOriginal} 
                  variant="outline"
                  className="w-full sm:w-auto text-base py-3 px-6"
                  disabled={isTranslating}
                >
                  Show Original
                </Button>
              )}
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
