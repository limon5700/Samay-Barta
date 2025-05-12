
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
import type { NewsArticle, Category, CreateNewsArticleData } from "@/lib/types"; // Import CreateNewsArticleData
import { categories as allNewsCategories } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

const articleFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }).max(150),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  excerpt: z.string().min(10, { message: "Excerpt must be at least 10 characters." }).max(300),
  category: z.string().refine(val => allNewsCategories.includes(val as Category) || val === "", { message: "Please select a valid category."}),
  imageUrl: z.string().optional().or(z.literal('')), // Allow Data URLs or regular URLs
  dataAiHint: z.string().max(50).optional().or(z.literal('')),
  inlineAdSnippetsInput: z.string().optional(), // Textarea input for snippets
});

// This represents the data structure after processing the form input
// Note: This is slightly different from NewsArticle as it doesn't have id/publishedDate yet
// and inlineAdSnippets is an array.
type ProcessedArticleFormData = Omit<CreateNewsArticleData, 'inlineAdSnippets'> & {
   inlineAdSnippets?: string[]; // Make sure this exists
   // Include other fields from the form schema if they differ from CreateNewsArticleData
   imageUrl?: string;
   dataAiHint?: string;
};


export type ArticleFormData = z.infer<typeof articleFormSchema>;

interface ArticleFormProps {
  article?: NewsArticle | null;
  // The onSubmit function should expect the final processed data structure
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
      // Join snippets array into a string for the textarea, handle if undefined/null
      inlineAdSnippetsInput: article?.inlineAdSnippets?.join('\n') || "",
    },
  });

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for Data URL
        toast({
          title: "Error",
          description: "Image size should not exceed 5MB for direct upload.",
          variant: "destructive",
        });
        event.target.value = ""; // Reset file input
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("imageUrl", reader.result as string);
        toast({
          title: "Image Selected",
          description: "Image ready to be saved with the article.",
        });
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read the image file.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

 const handleSubmit = (data: ArticleFormData) => {
    // Process the inlineAdSnippetsInput into an array
    const snippets = data.inlineAdSnippetsInput?.split('\n').filter(s => s.trim() !== '') || [];

    // Construct the final data object conforming to ProcessedArticleFormData
    const finalData: ProcessedArticleFormData = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        category: data.category,
        imageUrl: data.imageUrl || undefined, // Ensure empty string becomes undefined if needed by backend
        dataAiHint: data.dataAiHint || undefined,
        inlineAdSnippets: snippets,
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
              <FormControl>
                <Input placeholder="Enter article title" {...field} />
              </FormControl>
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
              <FormControl>
                <Textarea placeholder="Enter a short excerpt (summary)" {...field} rows={3} />
              </FormControl>
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
              <FormControl>
                <Textarea placeholder="Enter the full article content. Use [AD_INLINE] where you want inline ads." {...field} rows={10} />
              </FormControl>
               <FormDescription>Use the placeholder `[AD_INLINE]` within the content where you want an inline ad snippet to be inserted.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="inlineAdSnippetsInput"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inline Ad Snippets (AdSense/Adsterra)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Paste one ad code snippet per line. These will replace [AD_INLINE] placeholders in the content, in order."
                  {...field}
                  rows={5}
                />
              </FormControl>
              <FormDescription>Enter external ad code snippets (like AdSense) to be inserted within the article content where `[AD_INLINE]` is placed.</FormDescription>
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
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allNewsCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Upload Image (Optional)</FormLabel>
          <FormControl>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </FormControl>
          <FormDescription>
            Alternatively, you can paste an image URL below. Uploaded image (max 5MB) will populate the URL field.
          </FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (or from upload)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg or will be auto-filled by upload" {...field} />
              </FormControl>
              <FormDescription>
                 This field will be auto-filled if you upload an image. Otherwise, paste an external URL.
              </FormDescription>
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
              <FormControl>
                <Input placeholder="e.g., technology abstract" {...field} />
              </FormControl>
              <FormDescription>
                One or two keywords for AI image search (max 2 words).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (article ? "Saving..." : "Adding..." ): (article ? "Save Changes" : "Add Article")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
