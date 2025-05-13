
"use client";

import type { ChangeEvent } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NewsArticle, Category, CreateNewsArticleData } from "@/lib/types";
import { categories as allNewsCategories } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Info, Loader2, Youtube, Facebook, Link as LinkIcon } from "lucide-react";

const articleFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }).max(150),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  excerpt: z.string().min(10, { message: "Excerpt must be at least 10 characters." }).max(300),
  category: z.string().refine(val => allNewsCategories.includes(val as Category) || val === "", { message: "Please select a valid category."}),
  imageUrl: z.string().optional().or(z.literal('')),
  dataAiHint: z.string().max(50).optional().or(z.literal('')),
  inlineAdSnippetsInput: z.string().optional(),

  // SEO Fields
  metaTitle: z.string().max(70, "Meta title should be 70 chars or less.").optional().or(z.literal('')),
  metaDescription: z.string().max(160, "Meta description should be 160 chars or less.").optional().or(z.literal('')),
  metaKeywords: z.string().optional().or(z.literal('')), // Comma-separated
  ogTitle: z.string().max(70).optional().or(z.literal('')),
  ogDescription: z.string().max(200).optional().or(z.literal('')), // OG descriptions can be a bit longer
  ogImage: z.string().url("Must be a valid URL for OG image.").optional().or(z.literal('')),
  canonicalUrl: z.string().url("Must be a valid canonical URL.").optional().or(z.literal('')),

  // Article-specific social links
  articleYoutubeUrl: z.string().url("Must be a valid YouTube URL.").optional().or(z.literal('')),
  articleFacebookUrl: z.string().url("Must be a valid Facebook URL.").optional().or(z.literal('')),
  articleMoreLinksUrl: z.string().url("Must be a valid URL for 'More Links'.").optional().or(z.literal('')),
});

export type ArticleFormData = z.infer<typeof articleFormSchema>;

// This represents the data structure after processing the form input for submission
type ProcessedArticleFormData = CreateNewsArticleData;

interface ArticleFormProps {
  article?: NewsArticle | null;
  onSubmit: (data: ProcessedArticleFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ArticleForm({ article, onSubmit, onCancel, isSubmitting }: ArticleFormProps) {
  const { toast } = useToast();
  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: article?.title || "",
      content: article?.content || "",
      excerpt: article?.excerpt || "",
      category: article?.category || "",
      imageUrl: article?.imageUrl || "",
      dataAiHint: article?.dataAiHint || "",
      inlineAdSnippetsInput: article?.inlineAdSnippets?.join('\n\n') || "",
      // SEO Fields
      metaTitle: article?.metaTitle || "",
      metaDescription: article?.metaDescription || "",
      metaKeywords: article?.metaKeywords?.join(', ') || "",
      ogTitle: article?.ogTitle || "",
      ogDescription: article?.ogDescription || "",
      ogImage: article?.ogImage || "",
      canonicalUrl: article?.canonicalUrl || "",
      // Article-specific social links
      articleYoutubeUrl: article?.articleYoutubeUrl || "",
      articleFacebookUrl: article?.articleFacebookUrl || "",
      articleMoreLinksUrl: article?.articleMoreLinksUrl || "",
    },
  });

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "Image size should not exceed 5MB.",
          variant: "destructive",
        });
        event.target.value = ""; 
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("imageUrl", reader.result as string);
        toast({
          title: "Image Selected",
          description: "Image ready for saving.",
        });
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

 const handleSubmit = (data: ArticleFormData) => {
    const snippets = data.inlineAdSnippetsInput?.split('\n\n').map(s => s.trim()).filter(s => s !== '') || [];
    const keywordsArray = data.metaKeywords?.split(',').map(k => k.trim()).filter(k => k) || [];

    const finalData: ProcessedArticleFormData = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        category: data.category as Category,
        imageUrl: data.imageUrl || undefined,
        dataAiHint: data.dataAiHint || undefined,
        inlineAdSnippets: snippets,
        // SEO fields
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
        metaKeywords: keywordsArray,
        ogTitle: data.ogTitle || undefined,
        ogDescription: data.ogDescription || undefined,
        ogImage: data.ogImage || undefined,
        canonicalUrl: data.canonicalUrl || undefined,
        // Article-specific social links
        articleYoutubeUrl: data.articleYoutubeUrl || undefined,
        articleFacebookUrl: data.articleFacebookUrl || undefined,
        articleMoreLinksUrl: data.articleMoreLinksUrl || undefined,
    };
    onSubmit(finalData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl><Input placeholder="Enter article title" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Excerpt</FormLabel>
              <FormControl><Textarea placeholder="Enter a short excerpt (summary)" {...field} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Content</FormLabel>
              <FormControl><Textarea placeholder="Enter the full article content. Use [AD_INLINE] where you want inline ads." {...field} rows={10} /></FormControl>
              <FormDescription>Use `[AD_INLINE]` for inline ad placeholders.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="inlineAdSnippetsInput"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inline Ad Snippets (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Paste ad code snippets here, separated by a blank line." {...field} rows={6} /></FormControl>
              <FormDescription>Snippets replace `[AD_INLINE]` sequentially.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                <SelectContent>
                  {allNewsCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Upload Image (Optional)</FormLabel>
          <FormControl>
            <Input type="file" accept="image/*" onChange={handleImageUpload} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
          </FormControl>
          <FormDescription>Max 5MB. Upload populates the URL field below.</FormDescription>
        </FormItem>
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (or from upload)</FormLabel>
              <FormControl><Input placeholder="https://example.com/image.jpg or auto-filled" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dataAiHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image AI Hint (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., technology abstract" {...field} /></FormControl>
              <FormDescription>1-2 keywords for AI image search (max 2 words).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="seo-settings">
            <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                    <Info className="h-5 w-5" /> Advanced SEO Settings (Optional)
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4">
              <p className="text-sm text-muted-foreground">
                Override global SEO settings for this specific article. If left blank, defaults will be used (e.g., article title for meta title).
              </p>
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl><Input placeholder="Custom meta title for this article" {...field} /></FormControl>
                    <FormDescription>Max 70 characters. If blank, article title is used.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl><Textarea placeholder="Custom meta description for this article" {...field} rows={3} /></FormControl>
                    <FormDescription>Max 160 characters. If blank, article excerpt is used.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metaKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Keywords (comma-separated)</FormLabel>
                    <FormControl><Input placeholder="keywordA, keywordB, keywordC" {...field} /></FormControl>
                     <FormDescription>Specific keywords for this article.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ogTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Graph Title</FormLabel>
                    <FormControl><Input placeholder="Custom OG title for social sharing" {...field} /></FormControl>
                    <FormDescription>If blank, meta title or article title is used.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ogDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Graph Description</FormLabel>
                    <FormControl><Textarea placeholder="Custom OG description for social sharing" {...field} rows={3}/></FormControl>
                    <FormDescription>If blank, meta description or excerpt is used.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ogImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Graph Image URL</FormLabel>
                    <FormControl><Input type="url" placeholder="https://example.com/custom-og-image.jpg" {...field} /></FormControl>
                    <FormDescription>If blank, article's main image is used.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="canonicalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canonical URL</FormLabel>
                    <FormControl><Input type="url" placeholder="https://example.com/original-article-url" {...field} /></FormControl>
                    <FormDescription>If this article is a reprint or syndicated, specify the original URL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="article-social-links">
            <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" /> Article-Specific Social Links (Optional)
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4">
                 <p className="text-sm text-muted-foreground">
                Provide links related to this article for display on the article page (e.g., a relevant YouTube video).
              </p>
               <FormField
                control={form.control}
                name="articleYoutubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><Youtube className="h-4 w-4"/>YouTube URL</FormLabel>
                    <FormControl><Input type="url" placeholder="https://youtube.com/watch?v=relevantvideo" {...field} /></FormControl>
                    <FormDescription>A YouTube link specifically for this article.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="articleFacebookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><Facebook className="h-4 w-4"/>Facebook Post/Page URL</FormLabel>
                    <FormControl><Input type="url" placeholder="https://facebook.com/relevantpost" {...field} /></FormControl>
                    <FormDescription>A Facebook link specifically for this article.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="articleMoreLinksUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><LinkIcon className="h-4 w-4"/>More Related Links URL</FormLabel>
                    <FormControl><Input type="url" placeholder="https://example.com/related-resource" {...field} /></FormControl>
                    <FormDescription>Another relevant link for this article.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSubmitting ? (article ? "Saving..." : "Adding..." ): (article ? "Save Changes" : "Add Article")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
