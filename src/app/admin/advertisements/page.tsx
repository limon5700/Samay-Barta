
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { PlusCircle, Edit, Trash2, Loader2, ExternalLink, Eye, EyeOff, Code, Image as ImageIcon } from "lucide-react";
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
import AdvertisementForm, { type AdvertisementFormData } from "@/components/admin/AdvertisementForm";
import type { Advertisement, CreateAdvertisementData } from "@/lib/types";
import {
  getAllAdvertisements,
  addAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

export default function AdvertisementsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);

  const { toast } = useToast();

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedAds = await getAllAdvertisements();
      setAds(fetchedAds.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch advertisements.", variant: "destructive" });
      setAds([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleAddAd = () => {
    setEditingAd(null);
    setIsAddEditDialogOpen(true);
  };

  const handleEditAd = (ad: Advertisement) => {
    setEditingAd(ad);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteAd = (ad: Advertisement) => {
    setAdToDelete(ad);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAd = async () => {
    if (!adToDelete) return;
    setIsSubmitting(true);
    try {
      const success = await deleteAdvertisement(adToDelete.id);
      if (success) {
        await fetchAds();
        toast({ title: "Success", description: "Advertisement deleted successfully." });
      } else {
        toast({ title: "Error", description: "Failed to delete advertisement.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred while deleting the advertisement.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setAdToDelete(null);
    }
  };

  const handleFormSubmit = async (data: AdvertisementFormData) => {
    setIsSubmitting(true);
    try {
      if (editingAd) {
        // Ensure we pass the correct structure matching Advertisement type, excluding id/createdAt
        const updateData: Partial<Omit<Advertisement, 'id' | 'createdAt'>> = {
            placement: data.placement,
            adType: data.adType,
            isActive: data.isActive,
            imageUrl: data.adType === 'custom' ? data.imageUrl : undefined,
            linkUrl: data.adType === 'custom' ? data.linkUrl : undefined,
            altText: data.adType === 'custom' ? data.altText : undefined,
            codeSnippet: data.adType === 'external' ? data.codeSnippet : undefined,
        };

        const result = await updateAdvertisement(editingAd.id, updateData);
        if (result) {
          toast({ title: "Success", description: "Advertisement updated successfully." });
        } else {
           toast({ title: "Error", description: "Failed to update advertisement.", variant: "destructive" });
        }
      } else {
         // Prepare data for creation, ensuring correct structure
         const createData: CreateAdvertisementData = {
            placement: data.placement,
            adType: data.adType,
            isActive: data.isActive,
            imageUrl: data.adType === 'custom' ? data.imageUrl : undefined,
            linkUrl: data.adType === 'custom' ? data.linkUrl : undefined,
            altText: data.adType === 'custom' ? data.altText : undefined,
            codeSnippet: data.adType === 'external' ? data.codeSnippet : undefined,
         };
        const result = await addAdvertisement(createData);
         if (result) {
            toast({ title: "Success", description: "Advertisement added successfully." });
        } else {
            toast({ title: "Error", description: "Failed to add advertisement.", variant: "destructive" });
        }
      }
      await fetchAds();
      setIsAddEditDialogOpen(false);
      setEditingAd(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Error saving advertisement:", error);
      toast({ title: "Error", description: `An error occurred while saving the advertisement: ${errorMessage}`, variant: "destructive" });
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
            <CardTitle className="text-2xl font-bold text-primary">Manage Advertisements</CardTitle>
            <CardDescription>Add, edit, or delete advertisements for various placements.</CardDescription>
          </div>
          <Button onClick={handleAddAd} size="sm" className="ml-auto gap-1">
            <PlusCircle className="h-4 w-4" />
            Add New Ad
          </Button>
        </CardHeader>
        <CardContent>
          {ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No advertisements found. Add one to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Preview</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                     <TableCell>
                      {ad.adType === 'custom' && ad.imageUrl ? (
                        <div className="relative h-12 w-24 rounded overflow-hidden border">
                          <Image src={ad.imageUrl} alt={ad.altText || 'Ad Image'} fill style={{objectFit: 'contain'}} data-ai-hint="advertisement graphic"/>
                        </div>
                      ) : ad.adType === 'external' ? (
                        <div className="flex items-center justify-center h-12 w-24 rounded border bg-muted text-muted-foreground">
                          <Code className="h-6 w-6" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-12 w-24 rounded border bg-muted text-muted-foreground">
                          N/A
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="capitalize">
                        {ad.adType === 'custom' ? <ImageIcon className="mr-1 h-3 w-3" /> : <Code className="mr-1 h-3 w-3" />}
                        {ad.adType}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{ad.placement.replace('-', ' ')}</TableCell>
                    <TableCell>
                      {ad.adType === 'custom' && ad.linkUrl ? (
                        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                          {ad.linkUrl.length > 30 ? `${ad.linkUrl.substring(0, 27)}...` : ad.linkUrl }
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : ad.adType === 'external' && ad.codeSnippet ? (
                        <span className="text-xs text-muted-foreground italic">Code Snippet Set</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                       {ad.adType === 'custom' && ad.altText && <p className="text-xs text-muted-foreground mt-1">Alt: {ad.altText}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ad.isActive ? "default" : "outline"} className="capitalize">
                        {ad.isActive ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                        {ad.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAd(ad)} className="mr-2 hover:text-primary">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Ad</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAd(ad)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                         <span className="sr-only">Delete Ad</span>
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
          if (!isOpen) { setIsAddEditDialogOpen(false); setEditingAd(null); }
          else { setIsAddEditDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Advertisement" : "Add New Advertisement"}</DialogTitle>
            <DialogDescription>
              {editingAd ? "Modify the details of the existing ad." : "Fill in the details to create a new advertisement."}
            </DialogDescription>
          </DialogHeader>
          <AdvertisementForm
            advertisement={editingAd}
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsAddEditDialogOpen(false); setEditingAd(null); }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { setIsDeleteDialogOpen(false); setAdToDelete(null); }
          else { setIsDeleteDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this advertisement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setAdToDelete(null); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteAd} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
