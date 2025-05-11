
"use client";

import type * as z from "zod";
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
import type { NewsArticle, Category } from "@/lib/types";
import { categories as allNewsCategories } from "@/lib/data";

const articleFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }).max(150),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  excerpt: z.string().min(10, { message: "Excerpt must be at least 10 characters." }).max(300),
  category: z.string().refine(val => allNewsCategories.includes(val as Category) || val === "", { message: "Please select a valid category."}),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50).optional().or(z.literal('')),
});

export type ArticleFormData = z.infer<typeof articleFormSchema>;

interface ArticleFormProps {
  article?: NewsArticle | null;
  onSubmit: (data: ArticleFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ArticleForm({ article, onSubmit, onCancel, isSubmitting }: ArticleFormProps) {
  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: article?.title || "",
      content: article?.content || "",
      excerpt: article?.excerpt || "",
      category: article?.category || "",
      imageUrl: article?.imageUrl || "",
      dataAiHint: article?.dataAiHint || "",
    },
  });

  const handleSubmit = (data: ArticleFormData) => {
    onSubmit(data);
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
                <Textarea placeholder="Enter the full article content" {...field} rows={8} />
              </FormControl>
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

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg" {...field} />
              </FormControl>
              <FormDescription>
                Use services like Picsum Photos (e.g., https://picsum.photos/seed/example/400/200)
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
