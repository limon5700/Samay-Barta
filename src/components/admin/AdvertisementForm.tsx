
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
import { formatPlacementName } from "@/lib/utils"; // Import the utility function
import { ObjectId } from "mongodb"; // Import ObjectId for validation

// Update adPlacements with new options
const adPlacements: AdPlacement[] = [
    'homepage-top',
    'article-top',
    'article-bottom',
    'sidebar-left',
    'sidebar-right',
    'footer',
    'article-inline' // Keep this generic for now, specific slot logic handled elsewhere
];
const adTypes: AdType[] = ['custom', 'external'];

// Base schema
const baseAdFormSchema = z.object({
  placement: z.enum(adPlacements as [AdPlacement, ...AdPlacement[]], { required_error: "Please select an ad placement." }),
  adType: z.enum(adTypes as [AdType, ...AdType[]], { required_error: "Please select an ad type." }),
  articleId: z.string()
      .optional()
      .refine(val => !val || ObjectId.isValid(val), { // Validate if provided
          message: "Invalid Article ID format.",
      })
      .or(z.literal('')), // Allow empty string
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
        message: "A valid code snippet is required for external ads (min 10 chars).",
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
      articleId: advertisement?.articleId || "", // Initialize articleId
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

    // Ensure articleId is either a valid ObjectId string or undefined
    finalData.articleId = finalData.articleId && ObjectId.isValid(finalData.articleId)
        ? finalData.articleId
        : undefined;


    onSubmit(finalData);
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
                      {formatPlacementName(place)} {/* Use utility function */}
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
          name="articleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign to Specific Article (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter Article ID (leave blank for global placement)" {...field} />
              </FormControl>
              <FormDescription>
                If filled, this ad will only show on the specified article for the selected placement, overriding global ads.
              </FormDescription>
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
                      {type === 'custom' ? 'Custom Image Ad' : 'External Code Snippet (AdSense, etc.)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Select if this is a custom image/link ad or an external script.</FormDescription>
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
                <FormLabel>Code Snippet (HTML/JS)</FormLabel>
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

// Note: The CORS errors related to 'extensions.aitopia.ai' seen in the browser console are likely caused by a browser extension
// (possibly named Aitopia or similar) installed in your browser.
// These errors are NOT originating from the Samay Barta Lite application code itself and do not affect its functionality.
// The extension is trying to make requests to its own server, which are failing.
// To resolve these specific CORS errors, you may need to disable or reconfigure the problematic browser extension.

// Type error for replace() is likely due to the input to formatPlacementName sometimes not being a string, added safety checks in lib/utils.ts
