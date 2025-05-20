
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Role, Permission } from "@/lib/types";
import { availablePermissions, uiTexts } from "@/lib/constants"; // Assuming availablePermissions is an array of Permission strings
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/context/AppContext";

const roleFormSchema = z.object({
  name: z.string().min(3, "Role name must be at least 3 characters.").max(50),
  description: z.string().max(200).optional().or(z.literal('')),
  permissions: z.array(z.custom<Permission>()).default([]),
});

export type RoleFormData = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSubmit: (data: RoleFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function RoleForm({ role, onSubmit, onCancel, isSubmitting }: RoleFormProps) {
  const { getUIText } = useAppContext();

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions || [],
    },
  });

  const handleSubmit = (data: RoleFormData) => {
    onSubmit(data);
  };
  
  // Helper to get display name for a permission
  const getPermissionDisplayName = (permissionKey: Permission): string => {
    const keyMap: Record<Permission, string> = {
      'view_admin_dashboard': 'viewAdminDashboardPermission',
      'manage_articles': 'manageArticlesPermission',
      'publish_articles': 'publishArticlesPermission',
      'manage_users': 'manageUsersPermission',
      'manage_roles': 'manageRolesPermission',
      'manage_layout_gadgets': 'manageLayoutGadgetsPermission',
      'manage_seo_global': 'manageSeoGlobalPermission',
      'manage_settings': 'manageSettingsPermission',
    };
    return getUIText(keyMap[permissionKey] || permissionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getUIText("roleName")}</FormLabel>
              <FormControl><Input placeholder="e.g., Editor, Layout Manager" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getUIText("roleDescription")}</FormLabel>
              <FormControl><Textarea placeholder="Briefly describe this role's purpose." {...field} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>{getUIText("permissions")}</FormLabel>
          <FormDescription>Select the permissions for this role.</FormDescription>
          <ScrollArea className="h-48 rounded-md border p-4">
            {availablePermissions.map((permission) => (
              <FormField
                key={permission}
                control={form.control}
                name="permissions"
                render={({ field }) => {
                  return (
                    <FormItem
                      key={permission}
                      className="flex flex-row items-start space-x-3 space-y-0 mb-2"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(permission)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), permission])
                              : field.onChange(
                                (field.value || []).filter(
                                    (value) => value !== permission
                                  )
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {getPermissionDisplayName(permission)}
                      </FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </ScrollArea>
          <FormMessage />
        </FormItem>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {getUIText("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSubmitting ? (role ? "Saving Role..." : "Adding Role...") : (role ? getUIText("save") : getUIText("addRole"))}
          </Button>
        </div>
      </form>
    </Form>
  );
}
