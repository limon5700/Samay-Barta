
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarChart3, Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSeoSettings, updateSeoSettings } from '@/lib/data'; 
import type { SeoSettings, CreateSeoSettingsData } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormDescription,
  FormLabel, 
} from "@/components/ui/form";


const seoFormSchema = z.object({
  siteTitle: z.string().min(3, "Site title must be at least 3 characters.").max(70, "Site title must be 70 characters or less.").optional().or(z.literal('')),
  metaDescription: z.string().min(10, "Meta description must be at least 10 characters.").max(160, "Meta description must be 160 characters or less.").optional().or(z.literal('')),
  metaKeywords: z.string().optional().or(z.literal('')), // Comma-separated string
  faviconUrl: z.string().url("Must be a valid URL, e.g., /favicon.ico or https://example.com/favicon.png").optional().or(z.literal('')),
  ogSiteName: z.string().optional().or(z.literal('')),
  ogLocale: z.string().regex(/^[a-z]{2}_[A-Z]{2}$/, "Must be in ll_CC format, e.g., en_US").optional().or(z.literal('')),
  ogType: z.string().optional().or(z.literal('')),
  twitterCard: z.enum(["summary", "summary_large_image", "app", "player"]).optional().or(z.literal('')),
  twitterSite: z.string().regex(/^@?(\w){1,15}$/, "Must be a valid Twitter handle, e.g., @username").optional().or(z.literal('')),
  twitterCreator: z.string().regex(/^@?(\w){1,15}$/, "Must be a valid Twitter handle, e.g., @username").optional().or(z.literal('')),
});

type SeoFormData = z.infer<typeof seoFormSchema>;

export default function SeoManagementPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SeoFormData>({
    resolver: zodResolver(seoFormSchema),
    defaultValues: {
      siteTitle: '',
      metaDescription: '',
      metaKeywords: '',
      faviconUrl: '',
      ogSiteName: '',
      ogLocale: 'bn_BD', // Default to bn_BD as per general app context
      ogType: 'website',
      twitterCard: 'summary_large_image',
      twitterSite: '',
      twitterCreator: '',
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const currentSettings = await getSeoSettings();
        if (currentSettings) {
          form.reset({
            siteTitle: currentSettings.siteTitle || '',
            metaDescription: currentSettings.metaDescription || '',
            metaKeywords: (currentSettings.metaKeywords || []).join(', '),
            faviconUrl: currentSettings.faviconUrl || '',
            ogSiteName: currentSettings.ogSiteName || '',
            ogLocale: currentSettings.ogLocale || 'bn_BD',
            ogType: currentSettings.ogType || 'website',
            twitterCard: currentSettings.twitterCard as any || 'summary_large_image',
            twitterSite: currentSettings.twitterSite || '',
            twitterCreator: currentSettings.twitterCreator || '',
          });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load SEO settings.", variant: "destructive" });
        console.error("Error fetching SEO settings for form:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: SeoFormData) => {
    setIsSubmitting(true);
    try {
      const updateData: CreateSeoSettingsData = {
        ...data,
        metaKeywords: data.metaKeywords?.split(',').map(k => k.trim()).filter(k => k) || [],
      };
      const result = await updateSeoSettings(updateData);
      if (result) {
        toast({ title: "Success", description: "SEO settings updated successfully." });
        form.reset({ // Re-initialize form with potentially updated (from DB) and current data
            ...data, 
            metaKeywords: (result.metaKeywords || []).join(', '), 
        });
      } else {
        toast({ title: "Error", description: "Failed to update SEO settings. No result returned.", variant: "destructive" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to update SEO settings: ${errorMessage}`, variant: "destructive" });
      console.error("Error submitting SEO form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const errorExplanation = (
     <Card className="mb-6 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30">
        <CardHeader>
            <CardTitle className="text-lg text-yellow-800 dark:text-yellow-300">Note on Console Errors & Page Display</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-700 dark:text-yellow-200 space-y-2">
            <p>
                If you see errors in your browser's developer console related to <code>extensions.aitopia.ai</code> or similar domains not controlled by this application, these are likely caused by a browser extension you have installed. These errors are not part of Samay Barta Lite and can usually be ignored or resolved by managing your browser extensions.
            </p>
            <p>
                If this SEO Management page appears blank or doesn't load correctly, and there are no errors in the console directly related to <code>seo/page.tsx</code> or <code>lib/data.ts</code>, the issue might still be due to browser extension interference or a network problem preventing data loading. Please check for other console errors that are not from third-party extensions.
            </p>
        </CardContent>
     </Card>
  );


  return (
    <div className="container mx-auto py-8">
      {errorExplanation}
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <BarChart3 /> Global SEO Management
          </CardTitle>
          <CardDescription>
            Manage default Search Engine Optimization settings for your entire site. These can be overridden on individual articles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-700 dark:text-blue-300">SEO Configuration</AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-400">
                These settings provide global defaults for your site's SEO. For specific articles, you can set more granular SEO options on the article editing page. Full user role management for SEO specialists is a planned feature.
              </AlertDescription>
            </Alert>

            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="siteTitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Site Title</FormLabel>
                                <FormControl><Input placeholder="Your Site Name" {...field} /></FormControl>
                                <FormDescription>The main title for your website (max 70 chars).</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="faviconUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Favicon URL</FormLabel>
                                <FormControl><Input placeholder="/favicon.ico or https://example.com/icon.png" {...field} /></FormControl>
                                 <FormDescription>URL to your site's favicon.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Global Meta Description</FormLabel>
                            <FormControl><Textarea placeholder="A short description of your site for search engines." rows={3} {...field} /></FormControl>
                            <FormDescription>Default meta description (max 160 chars).</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="metaKeywords"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Global Meta Keywords (comma-separated)</FormLabel>
                            <FormControl><Input placeholder="keyword1, keyword2, keyword3" {...field} /></FormControl>
                            <FormDescription>Default keywords. Use sparingly as they have less impact now.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <h3 className="text-lg font-semibold pt-4 border-t mt-6">Open Graph Settings (for social sharing)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="ogSiteName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Open Graph Site Name</FormLabel>
                                <FormControl><Input placeholder="Your Site Name (for OG)" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="ogLocale"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Open Graph Locale</FormLabel>
                                <FormControl><Input placeholder="en_US or bn_BD" {...field} /></FormControl>
                                <FormDescription>e.g., en_US, bn_BD</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="ogType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Open Graph Type</FormLabel>
                                <FormControl><Input placeholder="website / article" {...field} /></FormControl>
                                <FormDescription>Usually "website" for homepage, "article" for articles.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <h3 className="text-lg font-semibold pt-4 border-t mt-6">Twitter Card Settings</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="twitterCard"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Twitter Card Type</FormLabel>
                                <FormControl>
                                    <select {...field} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                        <option value="summary">summary</option>
                                        <option value="summary_large_image">summary_large_image</option>
                                        <option value="app">app</option>
                                        <option value="player">player</option>
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="twitterSite"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Twitter Site Handle</FormLabel>
                                <FormControl><Input placeholder="@YourSiteTwitter" {...field} /></FormControl>
                                <FormDescription>Your site's Twitter username.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="twitterCreator"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Twitter Creator Handle (Optional)</FormLabel>
                                <FormControl><Input placeholder="@AuthorTwitter" {...field} /></FormControl>
                                <FormDescription>Default author Twitter username (if applicable).</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save SEO Settings"}
                </Button>
            </form>
            </Form>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

