
"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Loader2, LayoutPanelLeft, CornerDownRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import GadgetForm, { type GadgetFormData } from "@/components/admin/GadgetForm"; // Import the new form
import type { Gadget, LayoutSection, CreateGadgetData } from "@/lib/types";
import {
  getAllGadgets,
  addGadget,
  updateGadget,
  deleteGadget,
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { formatSectionName } from "@/lib/utils";

// Define the structure of the layout sections visible in the editor
const layoutStructure: { name: string; section: LayoutSection; description: string }[] = [
  { name: "Header Area", section: 'header-logo-area', description: "Gadgets below the site title/logo." },
  { name: "Below Header", section: 'below-header', description: "Full width area below the header." },
  { name: "Homepage Top", section: 'homepage-top', description: "Area above the main content on the homepage." },
  { name: "Sidebar Left", section: 'sidebar-left', description: "Left sidebar on homepage and article pages." },
  { name: "Sidebar Right", section: 'sidebar-right', description: "Right sidebar on homepage and article pages." },
  { name: "Article Top", section: 'article-top', description: "Area above the content on article pages." },
  { name: "Article Bottom", section: 'article-bottom', description: "Area below the content on article pages." },
   { name: "Article Inline (Default)", section: 'article-inline', description: "Default ad shown for [AD_INLINE] if not set in article." },
  { name: "Footer", section: 'footer', description: "Site footer area." },
];

const validSections = new Set(layoutStructure.map(s => s.section));

export default function LayoutEditorPage() {
  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingGadget, setEditingGadget] = useState<Gadget | null>(null);
  const [selectedSection, setSelectedSection] = useState<LayoutSection | null>(null); // For adding new gadget

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [gadgetToDelete, setGadgetToDelete] = useState<Gadget | null>(null);

  const { toast } = useToast();

  const fetchGadgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedGadgets = await getAllGadgets();
      setGadgets(Array.isArray(fetchedGadgets) ? fetchedGadgets : []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch layout gadgets.", variant: "destructive" });
      setGadgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGadgets();
  }, [fetchGadgets]);

  const handleAddGadget = (section: LayoutSection) => {
    setEditingGadget(null);
    setSelectedSection(section); // Set the section for the new gadget
    setIsAddEditDialogOpen(true);
  };

  const handleEditGadget = (gadget: Gadget) => {
    setEditingGadget(gadget);
    setSelectedSection(gadget.section); // Ensure section is set for editing
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteGadget = (gadget: Gadget) => {
    setGadgetToDelete(gadget);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteGadget = async () => {
    if (!gadgetToDelete) return;
    setIsSubmitting(true);
    try {
      const success = await deleteGadget(gadgetToDelete.id);
      if (success) {
        await fetchGadgets();
        toast({ title: "Success", description: "Gadget deleted successfully." });
      } else {
        toast({ title: "Error", description: "Failed to delete gadget.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred while deleting the gadget.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setGadgetToDelete(null);
    }
  };

  const handleFormSubmit = async (data: GadgetFormData) => {
    setIsSubmitting(true);
    try {
      const gadgetData: CreateGadgetData | Partial<Omit<Gadget, 'id' | 'createdAt'>> = {
        section: data.section,
        title: data.title,
        content: data.content,
        isActive: data.isActive,
        order: data.order,
      };

      let result: Gadget | null = null;
      if (editingGadget) {
        result = await updateGadget(editingGadget.id, gadgetData as Partial<Omit<Gadget, 'id' | 'createdAt'>>);
        if (result) {
          toast({ title: "Success", description: "Gadget updated successfully." });
        } else {
           toast({ title: "Error", description: "Failed to update gadget.", variant: "destructive" });
        }
      } else {
        result = await addGadget(gadgetData as CreateGadgetData);
         if (result) {
            toast({ title: "Success", description: "Gadget added successfully." });
        } else {
            toast({ title: "Error", description: "Failed to add gadget.", variant: "destructive" });
        }
      }

      if (result) {
         await fetchGadgets();
         setIsAddEditDialogOpen(false);
         setEditingGadget(null);
         setSelectedSection(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Error saving gadget:", error);
      toast({ title: "Error", description: `An error occurred while saving the gadget: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group gadgets by section, safely handling invalid/missing sections
  const gadgetsBySection = gadgets.reduce((acc, gadget) => {
    // Ensure gadget.section is a valid section defined in layoutStructure
    if (!gadget.section || !validSections.has(gadget.section)) {
      console.warn(`Gadget ${gadget.id} has invalid or missing section: "${gadget.section}". Skipping.`);
      return acc; // Skip gadgets with invalid/missing sections
    }
    const section = gadget.section;
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(gadget);
    // Sort gadgets within the section by order
    acc[section].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return acc;
  }, {} as Record<LayoutSection, Gadget[]>);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Explanation for the user regarding the 404 and CORS errors
  const errorExplanation = (
     <Card className="mb-6 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30">
        <CardHeader>
            <CardTitle className="text-lg text-yellow-800 dark:text-yellow-300">Note on Console Errors</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-700 dark:text-yellow-200 space-y-2">
            <p>
                You might see errors in your browser's developer console mentioning:
            </p>
            <ul className="list-disc pl-5 space-y-1">
                <li><code>GET /admin/advertisements 404 (Not Found)</code>: This specific path is not used. Gadget management is handled here on the "Layout Editor" page (<code>/admin/layout-editor</code>).</li>
                 <li><code>CORS policy</code> errors related to <code>extensions.aitopia.ai</code>: These errors are likely caused by a browser extension you have installed (like Aitopia) and are not related to this application's code. They can usually be ignored or resolved by managing your browser extensions.</li>
                <li><code>TypeError: Cannot read properties of undefined (reading 'replace')</code>: This issue related to gadget sections should now be resolved. If it persists, it might indicate corrupted gadget data in the database.</li>
            </ul>
        </CardContent>
     </Card>
  );

  return (
    <div className="container mx-auto py-8">
      {errorExplanation}

      <Card className="shadow-lg rounded-xl mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
             <LayoutPanelLeft className="h-6 w-6" /> Layout Editor
          </CardTitle>
          <CardDescription>Manage the layout sections and add HTML/JavaScript gadgets (like ads) to your site.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {layoutStructure.map(({ name, section, description }) => (
          <Card key={section} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              {(gadgetsBySection[section] || []).length > 0 ? (
                (gadgetsBySection[section] || []).map(gadget => (
                  <div key={gadget.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50 group">
                     <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div>
                            <p className="text-sm font-medium">{gadget.title || `Gadget #${gadget.id.substring(0, 6)}`}</p>
                            <Badge variant={gadget.isActive ? "default" : "outline"} className="mt-1 text-xs">
                                {gadget.isActive ? "Active" : "Inactive"}
                            </Badge>
                             <Badge variant="secondary" className="mt-1 text-xs ml-1">
                                Order: {gadget.order ?? 0}
                            </Badge>
                        </div>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" onClick={() => handleEditGadget(gadget)} className="h-7 w-7 hover:text-primary">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Gadget</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGadget(gadget)} className="h-7 w-7 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                         <span className="sr-only">Delete Gadget</span>
                      </Button>
                     </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No gadgets in this section.</p>
              )}
            </CardContent>
             <div className="p-4 mt-auto border-t">
                 <Button onClick={() => handleAddGadget(section)} size="sm" className="w-full gap-1">
                    <PlusCircle className="h-4 w-4" />
                    Add a Gadget
                </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Gadget Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { setIsAddEditDialogOpen(false); setEditingGadget(null); setSelectedSection(null); }
          else { setIsAddEditDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGadget ? "Edit Gadget" : "Add New Gadget"}</DialogTitle>
            <DialogDescription>
              {editingGadget
                ? "Modify the gadget's content or settings."
                : selectedSection // Check if selectedSection exists before formatting
                  ? `Add a new gadget to the "${formatSectionName(selectedSection)}" section.`
                  : "Add a new gadget." // Fallback description
              }
            </DialogDescription>
          </DialogHeader>
          {/* Conditionally render form to ensure defaultValues are correctly set */}
           {isAddEditDialogOpen && (
               <GadgetForm
                // Pass the specific gadget to edit, or a template with the pre-selected section for adding
                gadget={editingGadget ?? (selectedSection ? { section: selectedSection, isActive: true } as Gadget : null)}
                onSubmit={handleFormSubmit}
                onCancel={() => { setIsAddEditDialogOpen(false); setEditingGadget(null); setSelectedSection(null);}}
                isSubmitting={isSubmitting}
                availableSections={layoutStructure.map(s => s.section)}
                />
           )}
        </DialogContent>
      </Dialog>

       {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { setIsDeleteDialogOpen(false); setGadgetToDelete(null); }
          else { setIsDeleteDialogOpen(true); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the gadget titled &quot;{gadgetToDelete?.title || `Gadget #${gadgetToDelete?.id.substring(0,6)}`}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setGadgetToDelete(null); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteGadget} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Gadget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
