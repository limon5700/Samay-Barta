
"use client";

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
import { Switch } from "@/components/ui/switch";
import type { Advertisement } from "@/lib/types";

const adFormSchema = z.object({
  imageUrl: z.string().url({ message: "Please enter a valid image URL." }),
  linkUrl: z.string().url({ message: "Please enter a valid destination URL." }),
  altText: z.string().max(100, {message: "Alt text cannot exceed 100 characters."}).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export type AdvertisementFormData = z.infer<typeof adFormSchema>;

interface AdvertisementFormProps {
  advertisement?: Advertisement | null;
  onSubmit: (data: AdvertisementFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function AdvertisementForm({ advertisement, onSubmit, onCancel, isSubmitting }: AdvertisementFormProps) {
  const form = useForm<AdvertisementFormData>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      imageUrl: advertisement?.imageUrl || "",
      linkUrl: advertisement?.linkUrl || "",
      altText: advertisement?.altText || "",
      isActive: advertisement?.isActive === undefined ? true : advertisement.isActive,
    },
  });

  const handleSubmit = (data: AdvertisementFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/ad-image.jpg" {...field} />
              </FormControl>
              <FormDescription>The URL of the advertisement image.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/product-page" {...field} />
              </FormControl>
              <FormDescription>The URL where users will be redirected upon clicking the ad.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="altText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alt Text (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Descriptive text for the ad image" {...field} />
              </FormControl>
              <FormDescription>Accessibility text for the image.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Set whether this advertisement is currently active and displayed.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (advertisement ? "Saving Ad..." : "Adding Ad...") : (advertisement ? "Save Ad Changes" : "Add Advertisement")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
