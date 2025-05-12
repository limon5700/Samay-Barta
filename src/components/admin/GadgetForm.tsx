
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Gadget, LayoutSection } from "@/lib/types";
import { formatSectionName } from "@/lib/utils";

// Define available layout sections for the dropdown
// This could potentially be fetched dynamically in the future
const availableSections: LayoutSection[] = [
    'homepage-top',
    'article-top',
    'article-bottom',
    'sidebar-left',
    'sidebar-right',
    'footer',
    'article-inline',
    'header-logo-area',
    'below-header',
];

const gadgetFormSchema = z.object({
  section: z.enum(availableSections as [LayoutSection, ...LayoutSection[]], {
       required_error: "Please select a layout section."
    }),
  title: z.string().max(100).optional().or(z.literal('')), // Optional title
  content: z.string().min(10, { message: "Gadget content (HTML/JS) must be at least 10 characters." }),
  isActive: z.boolean().default(true),
  order: z.coerce.number().optional(), // Optional order number
});

export type GadgetFormData = z.infer<typeof gadgetFormSchema>;

interface GadgetFormProps {
  gadget?: Gadget | null;
  onSubmit: (data: GadgetFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  availableSections: LayoutSection[]; // Pass available sections
}

export default function GadgetForm({ gadget, onSubmit, onCancel, isSubmitting, availableSections: sections }: GadgetFormProps) {
  const form = useForm<GadgetFormData>({
    resolver: zodResolver(gadgetFormSchema),
    defaultValues: {
      section: gadget?.section || sections[0],
      title: gadget?.title || "",
      content: gadget?.content || "",
      isActive: gadget?.isActive === undefined ? true : gadget.isActive,
      order: gadget?.order || 0,
    },
  });

  const handleSubmit = (data: GadgetFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

        <FormField
          control={form.control}
          name="section"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Layout Section</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select where the gadget will appear" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sections.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {formatSectionName(sec)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Choose the location for this gadget.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Sidebar Ad Unit 1" {...field} />
              </FormControl>
              <FormDescription>An optional title for identifying the gadget in the admin panel.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gadget Content (HTML/JS)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Paste your ad code or other HTML/JS snippet here." {...field} rows={8} />
                </FormControl>
                <FormDescription>The actual HTML or JavaScript code for this gadget (e.g., AdSense code, custom banner HTML).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormDescription>Lower numbers appear first within the section. Default is 0.</FormDescription>
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
                  Set whether this gadget is currently active and displayed on the site.
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
            {isSubmitting ? (gadget ? "Saving Gadget..." : "Adding Gadget...") : (gadget ? "Save Gadget Changes" : "Add Gadget")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
