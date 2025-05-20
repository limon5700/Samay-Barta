
"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Loader2, UsersIcon } from "lucide-react";
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
import UserForm, { type UserFormData } from "@/components/admin/UserForm";
import type { User, Role, CreateUserData, UpdateUserData } from "@/lib/types";
import {
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  getAllRoles, // To populate roles in UserForm
  addActivityLogEntry
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import { getSession } from "@/app/admin/auth/actions"; // To get current user for logging

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]); // For UserForm
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { toast } = useToast();
  const { getUIText } = useAppContext();


  const fetchUsersAndRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedRoles] = await Promise.all([
        getAllUsers(),
        getAllRoles()
      ]);
      setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
      setRoles(Array.isArray(fetchedRoles) ? fetchedRoles : []);
    } catch (error) {
      toast({ title: getUIText("error"), description: "Failed to fetch users or roles.", variant: "destructive" });
      setUsers([]);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, getUIText]);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const handleAddUser = () => {
    setEditingUser(null);
    setIsAddEditDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      const session = await getSession();
      const success = await deleteUser(userToDelete.id);
      if (success) {
        await fetchUsersAndRoles();
        toast({ title: getUIText("userDeleted"), description: `User "${userToDelete.username}" deleted successfully.` });
        await addActivityLogEntry({ 
            userId: session?.userId || 'unknown', 
            username: session?.username || 'Unknown User', 
            action: 'user_deleted', 
            targetType: 'user', 
            targetId: userToDelete.id,
            details: { deletedUsername: userToDelete.username }
        });
      } else {
        toast({ title: getUIText("error"), description: "Failed to delete user.", variant: "destructive" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: getUIText("error"), description: `Error deleting user: ${msg}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleFormSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      const session = await getSession();
      if (editingUser) {
        const updateData: UpdateUserData = {
          username: data.username,
          email: data.email,
          roles: data.roles,
          isActive: data.isActive,
        };
        if (data.password) { // Only include password if it's being changed
          updateData.password = data.password;
        }
        const result = await updateUser(editingUser.id, updateData);
        if (result) {
          toast({ title: getUIText("userUpdated"), description: `User "${result.username}" updated.` });
          await addActivityLogEntry({ 
            userId: session?.userId || 'unknown', 
            username: session?.username || 'Unknown User', 
            action: 'user_updated', 
            targetType: 'user', 
            targetId: editingUser.id,
            details: { updatedFields: Object.keys(updateData) }
          });
        } else {
          toast({ title: getUIText("error"), description: "Failed to update user.", variant: "destructive" });
        }
      } else {
        const createData: CreateUserData = {
          username: data.username,
          email: data.email,
          password: data.password, // Password is required for new user
          roles: data.roles,
          isActive: data.isActive,
        };
        const result = await addUser(createData);
        if (result) {
          toast({ title: getUIText("userCreated"), description: `User "${result.username}" created.` });
           await addActivityLogEntry({ 
            userId: session?.userId || 'unknown', 
            username: session?.username || 'Unknown User', 
            action: 'user_created', 
            targetType: 'user', 
            targetId: result.id,
            details: { newUsername: result.username }
          });
        } else {
          toast({ title: getUIText("error"), description: "Failed to add user.", variant: "destructive" });
        }
      }
      await fetchUsersAndRoles();
      setIsAddEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: getUIText("error"), description: `Error saving user: ${msg}`, variant: "destructive" });
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
              <UsersIcon /> {getUIText("manageUsers")}
            </CardTitle>
            <CardDescription>Add, edit, or delete admin users and assign roles.</CardDescription>
          </div>
          <Button onClick={handleAddUser} size="sm" className="ml-auto gap-1">
            <PlusCircle className="h-4 w-4" />
            {getUIText("addUser")}
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
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
                      {user.roles.map(roleId => roles.find(r => r.id === roleId)?.name || roleId).join(', ') || 'No Roles'}
                    </TableCell>
                    <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)} className="mr-2 hover:text-primary">
                        <Edit className="h-4 w-4" />
                         <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)} className="hover:text-destructive">
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
        if (!isOpen) { setIsAddEditDialogOpen(false); setEditingUser(null); } 
        else { setIsAddEditDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? getUIText("editUser") : getUIText("addUser")}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Modify the details of the existing user." : "Fill in the details for the new user."}
            </DialogDescription>
          </DialogHeader>
          {isAddEditDialogOpen && ( // Ensure form is mounted only when dialog is open
            <UserForm
              user={editingUser}
              roles={roles} // Pass all available roles
              onSubmit={handleFormSubmit}
              onCancel={() => { setIsAddEditDialogOpen(false); setEditingUser(null); }}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
         if (!isOpen) { setIsDeleteDialogOpen(false); setUserToDelete(null); }
         else { setIsDeleteDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getUIText("confirmDeleteUser")}</DialogTitle>
            <DialogDescription>
              {getUIText("confirmDeleteUser")} &quot;{userToDelete?.username}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setUserToDelete(null);}} disabled={isSubmitting}>
              {getUIText("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {getUIText("deleteUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
