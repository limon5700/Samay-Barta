
"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Loader2, BarChartBig, Users, FileText, Zap, Activity, CalendarClock, Eye } from "lucide-react";
import { formatInTimeZone } from 'date-fns-tz';
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
import type { NewsArticle, CreateNewsArticleData, DashboardAnalytics } from "@/lib/types";
import {
  getAllNewsArticles,
  addNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
  getDashboardAnalytics, // Import the new analytics function
  getTopUserPostActivity
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import AnalyticsCard from "@/components/admin/AnalyticsCard"; // Import the new AnalyticsCard

const DHAKA_TIMEZONE = 'Asia/Dhaka';

export default function DashboardPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [topUsersActivity, setTopUsersActivity] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);

  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    setIsAnalyticsLoading(true);
    try {
      const [analyticsData, topUsers] = await Promise.all([
        getDashboardAnalytics(),
        getTopUserPostActivity(5) // Fetch top 5 users
      ]);
      setAnalytics(analyticsData);
      setTopUsersActivity(topUsers);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch dashboard analytics.", variant: "destructive" });
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [toast]);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedArticles = await getAllNewsArticles();
      const safeArticles = Array.isArray(fetchedArticles) ? fetchedArticles : [];
      setArticles(safeArticles.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()));
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch articles.", variant: "destructive" });
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
    fetchArticles();
  }, [fetchDashboardData, fetchArticles]);

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
      const success = await deleteNewsArticle(articleToDelete.id);
      if (success) {
        await fetchArticles(); 
        await fetchDashboardData(); // Refresh analytics
        toast({ title: "Success", description: "Article deleted successfully." });
      } else {
        toast({ title: "Error", description: "Failed to delete article.", variant: "destructive" });
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
       console.error("Error deleting article:", error);
       toast({ title: "Error", description: `An error occurred while deleting the article: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };

  const handleFormSubmit = async (data: ArticleFormData) => {
    setIsSubmitting(true);
    try {
      if (editingArticle) {
         const updateData: Partial<Omit<NewsArticle, 'id' | 'publishedDate'>> = {
            title: data.title,
            content: data.content,
            excerpt: data.excerpt,
            category: data.category,
            imageUrl: data.imageUrl,
            dataAiHint: data.dataAiHint,
            inlineAdSnippets: data.inlineAdSnippetsInput?.split('\n\n').map(s => s.trim()).filter(s => s !== '') || [],
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription,
            metaKeywords: data.metaKeywords?.split(',').map(k => k.trim()).filter(k => k),
            ogTitle: data.ogTitle,
            ogDescription: data.ogDescription,
            ogImage: data.ogImage,
            canonicalUrl: data.canonicalUrl,
         };
        const result = await updateNewsArticle(editingArticle.id, updateData);
        if (result) {
          toast({ title: "Success", description: "Article updated successfully." });
        } else {
           toast({ title: "Error", description: "Failed to update article.", variant: "destructive" });
        }
      } else {
         const createData: CreateNewsArticleData = {
            title: data.title,
            content: data.content,
            excerpt: data.excerpt,
            category: data.category,
            imageUrl: data.imageUrl,
            dataAiHint: data.dataAiHint,
            inlineAdSnippets: data.inlineAdSnippetsInput?.split('\n\n').map(s => s.trim()).filter(s => s !== '') || [],
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription,
            metaKeywords: data.metaKeywords?.split(',').map(k => k.trim()).filter(k => k),
            ogTitle: data.ogTitle,
            ogDescription: data.ogDescription,
            ogImage: data.ogImage,
            canonicalUrl: data.canonicalUrl,
         };
        const result = await addNewsArticle(createData);
         if (result) {
            toast({ title: "Success", description: "Article added successfully." });
        } else {
            toast({ title: "Error", description: "Failed to add article.", variant: "destructive" });
        }
      }
      await fetchArticles(); 
      await fetchDashboardData(); // Refresh analytics
      setIsAddEditDialogOpen(false);
      setEditingArticle(null);
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
       console.error("Error saving article:", error);
       toast({ title: "Error", description: `An error occurred while saving the article: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAnalyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Analytics Overview Section */}
      <Card className="shadow-lg rounded-xl mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <BarChartBig /> Site Overview
          </CardTitle>
          <CardDescription>A quick look at your site's key metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnalyticsCard title="Total Articles" value={analytics.totalArticles.toString()} icon={FileText} />
              <AnalyticsCard title="Articles Today" value={analytics.articlesToday.toString()} icon={CalendarClock} />
              <AnalyticsCard title="Total Users" value={analytics.totalUsers.toString()} icon={Users} />
              <AnalyticsCard title="Active Gadgets" value={analytics.activeGadgets.toString()} icon={Zap} />
              
              {/* Placeholder for Visitor Stats - requires backend implementation */}
              <AnalyticsCard title="Visitors Today" value={analytics.visitorStats?.today.toString() ?? "N/A"} icon={Eye} description="Requires tracking setup" />
              <AnalyticsCard title="Active Visitors Now" value={analytics.visitorStats?.activeNow?.toString() ?? "N/A"} icon={Activity} description="Requires tracking setup" />
              <AnalyticsCard title="Visitors This Week" value={analytics.visitorStats?.thisWeek.toString() ?? "N/A"} icon={Eye} description="Requires tracking setup" />
              <AnalyticsCard title="Visitors This Month" value={analytics.visitorStats?.thisMonth.toString() ?? "N/A"} icon={Eye} description="Requires tracking setup" />

            </div>
          ) : (
             <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}
        </CardContent>
      </Card>
      
      {/* User Post Activity Section - Placeholder */}
      {topUsersActivity.length > 0 && (
        <Card className="shadow-lg rounded-xl mb-8">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                    <Users /> Top User Activity
                </CardTitle>
                <CardDescription>Most active users by post count (requires author tracking).</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Posts Today</TableHead>
                            <TableHead>Posts This Week</TableHead>
                            <TableHead>Posts This Month</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topUsersActivity.map(user => (
                            <TableRow key={user.userId}>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.postsToday}</TableCell>
                                <TableCell>{user.postsThisWeek}</TableCell>
                                <TableCell>{user.postsThisMonth}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 <p className="text-xs text-muted-foreground mt-2">Note: User post activity relies on articles being associated with authors (authorId).</p>
            </CardContent>
        </Card>
      )}


      {/* Manage News Articles Section */}
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
                    <TableCell>{formatInTimeZone(new Date(article.publishedDate), DHAKA_TIMEZONE, "MMM d, yyyy, h:mm a zzz")}</TableCell>
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
          {isAddEditDialogOpen && (
            <ArticleForm
              article={editingArticle}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                  setIsAddEditDialogOpen(false);
                  setEditingArticle(null);
              }}
              isSubmitting={isSubmitting}
            />
          )}
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
