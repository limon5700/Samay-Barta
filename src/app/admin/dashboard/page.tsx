
"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
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
import ArticleForm, { type ArticleFormData } from "@/components/admin/ArticleForm";
import type { NewsArticle } from "@/lib/types";
import {
  sampleNewsArticles,
  addNewsArticle as addArticleData,
  updateNewsArticle as updateArticleData,
  deleteNewsArticle as deleteArticleData,
  CreateNewsArticleData
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching articles
    setIsLoading(true);
    // In a real app, fetch from API/DB. Here we use the mutable sample data.
    setArticles([...sampleNewsArticles].sort((a,b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()));
    setIsLoading(false);
  }, []);

  const refreshArticles = () => {
     setArticles([...sampleNewsArticles].sort((a,b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()));
  }

  const handleAddArticle = () => {
    setEditingArticle(null);
    setIsAddEditDialogOpen(true);
  };

  const handleEditArticle = (article: NewsArticle) => {
    setEditingArticle(article);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteArticle = (article: NewsArticle) => {
    setArticleToDelete(article);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteArticle = async () => {
    if (!articleToDelete) return;
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const success = deleteArticleData(articleToDelete.id);
      if (success) {
        refreshArticles();
        toast({ title: "Success", description: "Article deleted successfully." });
      } else {
        toast({ title: "Error", description: "Failed to delete article.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };

  const handleFormSubmit = async (data: ArticleFormData) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      if (editingArticle) {
        const result = updateArticleData(editingArticle.id, data as Partial<Omit<NewsArticle, 'id' | 'publishedDate'>>);
        if (result) {
          toast({ title: "Success", description: "Article updated successfully." });
        } else {
           toast({ title: "Error", description: "Failed to update article.", variant: "destructive" });
        }
      } else {
        addArticleData(data as CreateNewsArticleData);
        toast({ title: "Success", description: "Article added successfully." });
      }
      refreshArticles();
      setIsAddEditDialogOpen(false);
      setEditingArticle(null);
    } catch (error) {
      toast({ title: "Error", description: "An error occurred while saving the article.", variant: "destructive" });
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
            <CardTitle className="text-2xl font-bold text-primary">Manage News Articles</CardTitle>
            <CardDescription>Add, edit, or delete news articles.</CardDescription>
          </div>
          <Button onClick={handleAddArticle} size="sm" className="ml-auto gap-1">
            <PlusCircle className="h-4 w-4" />
            Add New Article
          </Button>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No articles found. Add one to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Published Date</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>{article.category}</TableCell>
                    <TableCell>{format(new Date(article.publishedDate), "MMM d, yyyy, h:mm a")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditArticle(article)} className="mr-2 hover:text-primary">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteArticle(article)} className="hover:text-destructive">
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

      {/* Add/Edit Article Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setIsAddEditDialogOpen(false);
              setEditingArticle(null);
          } else {
              setIsAddEditDialogOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Edit Article" : "Add New Article"}</DialogTitle>
            <DialogDescription>
              {editingArticle ? "Modify the details of the existing article." : "Fill in the details to create a new news article."}
            </DialogDescription>
          </DialogHeader>
          <ArticleForm
            article={editingArticle}
            onSubmit={handleFormSubmit}
            onCancel={() => {
                setIsAddEditDialogOpen(false);
                setEditingArticle(null);
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setIsDeleteDialogOpen(false);
              setArticleToDelete(null);
          } else {
               setIsDeleteDialogOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the article &quot;{articleToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {
                setIsDeleteDialogOpen(false);
                setArticleToDelete(null);
            }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteArticle} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
