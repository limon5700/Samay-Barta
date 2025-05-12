
"use client";

import * as z from "zod";
import { useForm, Controller } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Advertisement, AdPlacement, AdType } from "@/lib/types";

const adPlacements: AdPlacement[] = ['homepage-top', 'article-top', 'article-bottom', 'article-inline', 'popup', 'native']; // Added more placement options
const adTypes: AdType[] = ['custom', 'external'];

// Base schema
const baseAdFormSchema = z.object({
  placement: z.enum(adPlacements as [AdPlacement, ...AdPlacement[]], { required_error: "Please select an ad placement." }),
  adType: z.enum(adTypes as [AdType, ...AdType[]], { required_error: "Please select an ad type." }),
  altText: z.string().max(100, { message: "Alt text cannot exceed 100 characters." }).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  // Fields made optional here, refinement below enforces requirements
  imageUrl: z.string().optional().or(z.literal('')),
  linkUrl: z.string().optional().or(z.literal('')),
  codeSnippet: z.string().optional().or(z.literal('')),
});

// Refinement to make fields required based on adType
const adFormSchema = baseAdFormSchema.superRefine((data, ctx) => {
  if (data.adType === 'custom') {
    if (!data.imageUrl || !z.string().url().safeParse(data.imageUrl).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['imageUrl'],
        message: "A valid Image URL is required for custom ads.",
      });
    }
    if (!data.linkUrl || !z.string().url().safeParse(data.linkUrl).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['linkUrl'],
        message: "A valid Destination URL is required for custom ads.",
      });
    }
  } else if (data.adType === 'external') {
    if (!data.codeSnippet || data.codeSnippet.trim().length < 10) { // Basic check for non-empty snippet
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codeSnippet'],
        message: "A valid code snippet is required for external ads.",
      });
    }
  }
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
      placement: advertisement?.placement || adPlacements[0],
      adType: advertisement?.adType || adTypes[0],
      imageUrl: advertisement?.imageUrl || "",
      linkUrl: advertisement?.linkUrl || "",
      altText: advertisement?.altText || "",
      codeSnippet: advertisement?.codeSnippet || "",
      isActive: advertisement?.isActive === undefined ? true : advertisement.isActive,
    },
  });

  const watchedAdType = form.watch("adType");

  const handleSubmit = (data: AdvertisementFormData) => {
    // Clear irrelevant fields based on adType before submitting
    const finalData = { ...data };
    if (data.adType === 'custom') {
      finalData.codeSnippet = '';
    } else { // adType === 'external'
      finalData.imageUrl = '';
      finalData.linkUrl = '';
      finalData.altText = ''; // Alt text is for images
    }
    onSubmit(finalData);
  };

  // Helper function to format placement names
  const formatPlacementName = (place: string): string => {
     // Extra safety checks: ensure 'place' is a non-empty string before calling replace
    if (typeof place !== 'string' || !place) {
      console.warn("formatPlacementName received invalid input:", place);
      return ''; 
    }
    try {
      return place.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    } catch (error) {
        console.error("Error in formatPlacementName with input:", place, error);
        return place; // Return original value on error
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

        <FormField
          control={form.control}
          name="placement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placement</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select where the ad will appear" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {adPlacements.map((place) => (
                    <SelectItem key={place} value={place}>
                      {formatPlacementName(place)} {/* Use helper function */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Choose the location for this advertisement.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ad Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of ad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {adTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'custom' ? 'Custom Image Ad' : 'External Code Snippet'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Select if this is a custom image/link ad or an external script (e.g., AdSense).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedAdType === 'custom' && (
          <>
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
          </>
        )}

        {watchedAdType === 'external' && (
          <FormField
            control={form.control}
            name="codeSnippet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code Snippet</FormLabel>
                <FormControl>
                  <Textarea placeholder="Paste ad code snippet here (e.g., AdSense code)" {...field} rows={6} />
                </FormControl>
                <FormDescription>Paste the HTML/JavaScript code provided by the ad network.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

// Note: The CORS errors related to 'extensions.aitopia.ai' are likely caused by a browser extension you have installed (possibly named Aitopia or similar). 
// These errors are not originating from the Samay Barta Lite application code itself. 
// To resolve these CORS errors, you may need to disable or configure the problematic browser extension.
