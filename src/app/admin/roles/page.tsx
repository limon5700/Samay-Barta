
"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Loader2, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RoleForm, { type RoleFormData } from "@/components/admin/RoleForm";
import type { Role, CreateRoleData, Permission } from "@/lib/types";
import {
  getAllRoles,
  addRole,
  updateRole,
  deleteRole,
  addActivityLogEntry,
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import { getSession } from "@/app/admin/auth/actions";

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const { toast } = useToast();
  const { getUIText } = useAppContext();
  
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
    // Fallback for any new/unmapped permissions
    const fallbackName = permissionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return getUIText(keyMap[permissionKey] || fallbackName);
  };


  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedRoles = await getAllRoles();
      setRoles(Array.isArray(fetchedRoles) ? fetchedRoles : []);
    } catch (error) {
      toast({ title: getUIText("error"), description: "Failed to fetch roles.", variant: "destructive" });
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, getUIText]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleAddRole = () => {
    setEditingRole(null);
    setIsAddEditDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsSubmitting(true);
    try {
      const session = await getSession();
      const success = await deleteRole(roleToDelete.id);
      if (success) {
        await fetchRoles();
        toast({ title: getUIText("roleDeleted"), description: `Role "${roleToDelete.name}" deleted.` });
        await addActivityLogEntry({ 
            userId: session?.userId || 'unknown_superadmin', 
            username: session?.username || 'SuperAdmin', 
            action: 'role_deleted', 
            targetType: 'role', 
            targetId: roleToDelete.id,
            details: { deletedRoleName: roleToDelete.name }
        });
      } else {
        toast({ title: getUIText("error"), description: "Failed to delete role.", variant: "destructive" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: getUIText("error"), description: `Error deleting role: ${msg}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleFormSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    try {
      const session = await getSession();
      if (editingRole) {
        const updateData: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>> = {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        };
        const result = await updateRole(editingRole.id, updateData);
        if (result) {
          toast({ title: getUIText("roleUpdated"), description: `Role "${result.name}" updated.` });
           await addActivityLogEntry({ 
            userId: session?.userId || 'unknown_superadmin', 
            username: session?.username || 'SuperAdmin', 
            action: 'role_updated', 
            targetType: 'role', 
            targetId: editingRole.id,
            details: { updatedRoleName: result.name, permissions: result.permissions }
          });
        } else {
          toast({ title: getUIText("error"), description: "Failed to update role.", variant: "destructive" });
        }
      } else {
        const createData: CreateRoleData = {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        };
        const result = await addRole(createData);
        if (result) {
          toast({ title: getUIText("roleCreated"), description: `Role "${result.name}" created.` });
          await addActivityLogEntry({ 
            userId: session?.userId || 'unknown_superadmin', 
            username: session?.username || 'SuperAdmin', 
            action: 'role_created', 
            targetType: 'role', 
            targetId: result.id,
            details: { newRoleName: result.name, permissions: result.permissions }
          });
        } else {
          toast({ title: getUIText("error"), description: "Failed to add role.", variant: "destructive" });
        }
      }
      await fetchRoles();
      setIsAddEditDialogOpen(false);
      setEditingRole(null);
    } catch (error) {
       const msg = error instanceof Error ? error.message : "An unknown error occurred.";
       toast({ title: getUIText("error"), description: `Error saving role: ${msg}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <ShieldCheckIcon /> {getUIText("manageRoles")}
            </CardTitle>
            <CardDescription>Define roles and assign permissions to them for admin users.</CardDescription>
          </div>
          <Button onClick={handleAddRole} size="sm" className="ml-auto gap-1">
            <PlusCircle className="h-4 w-4" />
            {getUIText("addRole")}
          </Button>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No roles found. Add one to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{getUIText("roleName")}</TableHead>
                  <TableHead>{getUIText("roleDescription")}</TableHead>
                  <TableHead>{getUIText("permissions")}</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {role.permissions.map(perm => (
                          <Badge key={perm} variant="outline" className="text-xs whitespace-nowrap">
                            {getPermissionDisplayName(perm)}
                          </Badge>
                        ))}
                        {role.permissions.length === 0 && <span className="text-xs text-muted-foreground">No permissions</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditRole(role)} className="mr-2 hover:text-primary">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddEditDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) { setIsAddEditDialogOpen(false); setEditingRole(null); }
        else { setIsAddEditDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? getUIText("editRole") : getUIText("addRole")}</DialogTitle>
          </DialogHeader>
          {isAddEditDialogOpen && (
            <RoleForm
              role={editingRole}
              onSubmit={handleFormSubmit}
              onCancel={() => { setIsAddEditDialogOpen(false); setEditingRole(null); }}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
         if (!isOpen) { setIsDeleteDialogOpen(false); setRoleToDelete(null); }
         else { setIsDeleteDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getUIText("confirmDeleteRole")}</DialogTitle>
            <DialogDescription>
              {getUIText("confirmDeleteRole")} &quot;{roleToDelete?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setRoleToDelete(null);}} disabled={isSubmitting}>
              {getUIText("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteRole} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {getUIText("deleteRole")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

