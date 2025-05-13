
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Role, CreateRoleData, Permission } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/context/AppContext";

const roleFormSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters.").max(50),
  permissions: z.array(z.string()).default([]), // Array of permission strings
});

export type RoleFormData = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  role?: Role | null;
  availablePermissions: Permission[];
  onSubmit: (data: RoleFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function RoleForm({ role, availablePermissions, onSubmit, onCancel, isSubmitting }: RoleFormProps) {
  const { getUIText } = useAppContext();
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name || "",
      permissions: role?.permissions || [],
    },
  });

  const handleSubmit = (data: RoleFormData) => {
    onSubmit(data);
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
              <FormControl><Input placeholder="Enter role name (e.g., Editor)" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="permissions"
          render={() => (
            <FormItem>
              <FormLabel>{getUIText("permissions")}</FormLabel>
              <ScrollArea className="h-48 rounded-md border p-2">
                {availablePermissions.map((permission) => (
                  <FormField
                    key={permission}
                    control={form.control}
                    name="permissions"
                    render={({ field }) => {
                      return (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
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
                            {getUIText(permission) || permission}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </ScrollArea>
              <FormDescription>Select permissions for this role.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {getUIText("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSubmitting ? (role ? "Saving..." : "Adding...") : (role ? getUIText("save") : getUIText("addRole"))}
          </Button>
        </div>
      </form>
    </Form>
  );
}
