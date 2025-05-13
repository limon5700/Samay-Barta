

"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Loader2, Users, Shield, KeyRound, ListChecks } from "lucide-react";
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
import type { User, Role, CreateUserData, CreateRoleData, Permission } from "@/lib/types";
import { 
    getAllUsers, addUser, updateUser, deleteUser, 
    getAllRoles, addRole, updateRole, deleteRole 
} from "@/lib/data";
import { availablePermissions } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import UserForm, { type UserFormData } from "@/components/admin/UserForm";
import RoleForm, { type RoleFormData } from "@/components/admin/RoleForm";
import { useAppContext } from "@/context/AppContext";

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserDeleteDialogOpen, setIsUserDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isRoleDeleteDialogOpen, setIsRoleDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  
  const { toast } = useToast();
  const { getUIText } = useAppContext();


  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
    } catch (error) {
      toast({ title: getUIText("error"), description: "Failed to fetch users.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast, getUIText]);

  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const fetchedRoles = await getAllRoles();
      setRoles(Array.isArray(fetchedRoles) ? fetchedRoles : []);
    } catch (error) {
      toast({ title: getUIText("error"), description: "Failed to fetch roles.", variant: "destructive" });
    } finally {
      setIsLoadingRoles(false);
    }
  }, [toast, getUIText]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // User Dialog Handlers
  const handleAddUser = () => {
    setEditingUser(null);
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserDialogOpen(true);
  };

  const handleDeleteUserDialog = (user: User) => {
    setUserToDelete(user);
    setIsUserDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      const success = await deleteUser(userToDelete.id);
      if (success) {
        await fetchUsers();
        toast({ title: "Success", description: `User "${userToDelete.username}" deleted.` });
      } else {
        toast({ title: getUIText("error"), description: "Failed to delete user.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: getUIText("error"), description: "An error occurred while deleting the user.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsUserDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleUserFormSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      let result: User | null = null;
      const userData: CreateUserData = {
        username: data.username,
        email: data.email,
        password: data.password, // Password will be handled by addUser/updateUser (ideally hashed)
        roles: data.roles,
        isActive: data.isActive,
      };

      if (editingUser) {
        result = await updateUser(editingUser.id, userData);
        if (result) toast({ title: "Success", description: "User updated successfully." });
      } else {
        result = await addUser(userData);
        if (result) toast({ title: "Success", description: "User added successfully." });
      }

      if (result) {
        await fetchUsers();
        setIsUserDialogOpen(false);
        setEditingUser(null);
      } else {
        toast({ title: getUIText("error"), description: `Failed to ${editingUser ? 'update' : 'add'} user.`, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: getUIText("error"), description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Dialog Handlers
  const handleAddRole = () => {
    setEditingRole(null);
    setIsRoleDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsRoleDialogOpen(true);
  };

  const handleDeleteRoleDialog = (role: Role) => {
    setRoleToDelete(role);
    setIsRoleDeleteDialogOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsSubmitting(true);
    try {
      const success = await deleteRole(roleToDelete.id);
      if (success) {
        await fetchRoles();
        await fetchUsers(); // Users might have had this role removed
        toast({ title: "Success", description: `Role "${roleToDelete.name}" deleted.` });
      } else {
        toast({ title: getUIText("error"), description: "Failed to delete role.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: getUIText("error"), description: "An error occurred while deleting the role.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsRoleDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleRoleFormSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    try {
      let result: Role | null = null;
      const roleData: CreateRoleData = {
        name: data.name,
        permissions: data.permissions,
      };

      if (editingRole) {
        result = await updateRole(editingRole.id, roleData);
         if (result) toast({ title: "Success", description: "Role updated successfully." });
      } else {
        result = await addRole(roleData);
         if (result) toast({ title: "Success", description: "Role added successfully." });
      }
      
      if (result) {
        await fetchRoles();
        await fetchUsers(); // Refresh users in case their effective permissions changed
        setIsRoleDialogOpen(false);
        setEditingRole(null);
      } else {
         toast({ title: getUIText("error"), description: `Failed to ${editingRole ? 'update' : 'add'} role.`, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: getUIText("error"), description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* User Management Section */}
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2"><Users /> {getUIText("userManagement")}</CardTitle>
            <CardDescription>Manage user accounts and their assigned roles.</CardDescription>
          </div>
          <Button onClick={handleAddUser} size="sm" className="ml-auto gap-1">
            <PlusCircle className="h-4 w-4" /> {getUIText("addUser")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No users found. Add one to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{getUIText("username")}</TableHead>
                  <TableHead>{getUIText("email")}</TableHead>
                  <TableHead>{getUIText("roles")}</TableHead>
                  <TableHead>{getUIText("userActive")}</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      {user.roles.map(roleId => roles.find(r => r.id === roleId)?.name || roleId.substring(0,6)).join(', ') || 'No roles'}
                    </TableCell>
                    <TableCell>
                        <Badge variant={user.isActive ? "default" : "outline"}>
                            {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)} className="mr-2 hover:text-primary">
                        <Edit className="h-4 w-4" /><span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUserDialog(user)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Management Section */}
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
             <CardTitle className="text-xl font-bold text-primary flex items-center gap-2"><Shield /> {getUIText("roleManagement")}</CardTitle>
            <CardDescription>Define roles and their permissions.</CardDescription>
          </div>
          <Button onClick={handleAddRole} size="sm" className="ml-auto gap-1">
            <PlusCircle className="h-4 w-4" /> {getUIText("addRole")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingRoles ? (
             <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : roles.length === 0 ? (
             <p className="text-center text-muted-foreground py-10">No roles found. Add one to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{getUIText("roleName")}</TableHead>
                  <TableHead>{getUIText("permissions")}</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="space-x-1">
                      {role.permissions.map(permission => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {getUIText(permission) || permission}
                        </Badge>
                      ))}
                      {role.permissions.length === 0 && "No permissions"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditRole(role)} className="mr-2 hover:text-primary">
                        <Edit className="h-4 w-4" /><span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRoleDialog(role)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* User Add/Edit Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { setIsUserDialogOpen(false); setEditingUser(null); } 
          else { setIsUserDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? getUIText("editUser") : getUIText("addUser")}</DialogTitle>
          </DialogHeader>
          {isUserDialogOpen && (
            <UserForm
                user={editingUser}
                roles={roles}
                onSubmit={handleUserFormSubmit}
                onCancel={() => { setIsUserDialogOpen(false); setEditingUser(null); }}
                isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* User Delete Confirmation Dialog */}
      <Dialog open={isUserDeleteDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { setIsUserDeleteDialogOpen(false); setUserToDelete(null); }
          else { setIsUserDeleteDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getUIText("confirmDeletion")}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user &quot;{userToDelete?.username}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {setIsUserDeleteDialogOpen(false); setUserToDelete(null);}} disabled={isSubmitting}>
              {getUIText("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {getUIText("deleteUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Add/Edit Dialog */}
       <Dialog open={isRoleDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { setIsRoleDialogOpen(false); setEditingRole(null); }
          else { setIsRoleDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? getUIText("editRole") : getUIText("addRole")}</DialogTitle>
          </DialogHeader>
           {isRoleDialogOpen && (
            <RoleForm
                role={editingRole}
                availablePermissions={availablePermissions}
                onSubmit={handleRoleFormSubmit}
                onCancel={() => {setIsRoleDialogOpen(false); setEditingRole(null);}}
                isSubmitting={isSubmitting}
            />
           )}
        </DialogContent>
      </Dialog>

      {/* Role Delete Confirmation Dialog */}
      <Dialog open={isRoleDeleteDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { setIsRoleDeleteDialogOpen(false); setRoleToDelete(null); }
          else { setIsRoleDeleteDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getUIText("confirmDeletion")}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete role &quot;{roleToDelete?.name}&quot;? This action cannot be undone and will remove the role from all assigned users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {setIsRoleDeleteDialogOpen(false); setRoleToDelete(null);}} disabled={isSubmitting}>
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
