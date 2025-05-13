
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox"; // For multiple role selection
import type { User, Role, CreateUserData } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/context/AppContext";

const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters.").max(50),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')), // Optional for editing if not changing
  roles: z.array(z.string()).default([]), // Array of role IDs
  isActive: z.boolean().default(true),
});

export type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User | null;
  roles: Role[]; // All available roles to assign
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function UserForm({ user, roles, onSubmit, onCancel, isSubmitting }: UserFormProps) {
  const { getUIText } = useAppContext();
  const formSchema = user
    ? userFormSchema.extend({ password: userFormSchema.shape.password.optional() }) // Password optional when editing
    : userFormSchema.required({ password: true }); // Password required when adding

  const form = useForm<UserFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      password: "", // Always empty initially for security, or handle display differently
      roles: user?.roles || [],
      isActive: user?.isActive === undefined ? true : user.isActive,
    },
  });

  const handleSubmit = (data: UserFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getUIText("username")}</FormLabel>
              <FormControl><Input placeholder="Enter username" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getUIText("email")}</FormLabel>
              <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getUIText("password")}{user ? " (Leave blank to keep current)" : ""}</FormLabel>
              <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="roles"
          render={() => (
            <FormItem>
              <FormLabel>{getUIText("roles")}</FormLabel>
              <ScrollArea className="h-32 rounded-md border p-2">
                {roles.map((role) => (
                  <FormField
                    key={role.id}
                    control={form.control}
                    name="roles"
                    render={({ field }) => {
                      return (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(role.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), role.id])
                                  : field.onChange(
                                      (field.value || []).filter(
                                        (value) => value !== role.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {role.name}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </ScrollArea>
              <FormDescription>Assign roles to this user.</FormDescription>
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
                <FormLabel>{getUIText("userActive")}</FormLabel>
                <FormDescription>
                  Set whether this user account is active.
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
            {getUIText("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSubmitting ? (user ? "Saving..." : "Adding...") : (user ? getUIText("save") : getUIText("addUser"))}
          </Button>
        </div>
      </form>
    </Form>
  );
}
