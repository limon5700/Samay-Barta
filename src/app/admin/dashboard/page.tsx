
"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Loader2, BarChartBig, Users, FileText, Zap, Activity, CalendarClock, Eye, AlertTriangle } from "lucide-react";
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
  getDashboardAnalytics,
  getTopUserPostActivity
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import AnalyticsCard from "@/components/admin/AnalyticsCard";
import ErrorBoundary from "@/components/ErrorBoundary"; // Import the ErrorBoundary

const DHAKA_TIMEZONE = 'Asia/Dhaka';

export default function DashboardPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [topUsersActivity, setTopUsersActivity] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);

  const { toast } = useToast();

  const ErrorExplanationCard = () => (
     <Card className="mb-6 border-destructive bg-destructive/10 dark:bg-destructive/20">
        <CardHeader>
            <CardTitle className="text-lg text-destructive-foreground dark:text-destructive-foreground/90">Important: Resolving Dashboard Access Issues</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive-foreground/90 dark:text-destructive-foreground/80 space-y-2">
            {pageError && (
              <p className="font-semibold border-b pb-2 mb-2">Specific Error: {pageError}</p>
            )}
            <p>
                If the dashboard is blank, not loading correctly, or you're experiencing login loops, please check the following:
            </p>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong>Environment Variables (Crucial for Vercel):</strong> Ensure <code>MONGODB_URI</code>, <code>GEMINI_API_KEY</code> (if AI features used), <code>ADMIN_USERNAME</code>, and <code>ADMIN_PASSWORD</code> are correctly set in your <strong>Vercel project settings</strong> for the Production environment (and Preview/Development if you use them). This is the most common cause of login failures and dashboard loading issues on Vercel. For local development, ensure they are correct in your <code>.env</code> file. The <code>MONGODB_URI</code> must be complete and not contain placeholders.</li>
                <li><strong>Database Connectivity:</strong> Verify your MongoDB Atlas IP allowlist includes Vercel's IPs and your local IP. Check if your MongoDB cluster is running and accessible. Incorrect credentials in the URI can also cause connection failures.</li>
                <li><strong>API Keys:</strong> Confirm your <code>GEMINI_API_KEY</code> (if used) is valid and has not exceeded its quota.</li>
                <li><strong>Server Logs:</strong> Check your Vercel deployment logs (Functions logs) or local terminal output (if running <code>npm run dev</code>) for detailed error messages from the server. These logs are vital for diagnosing "Server Components render" failures, login action failures, or data fetching problems.</li>
                <li><strong>Browser Extensions:</strong> Errors in the browser console related to <code>extensions.aitopia.ai</code> or similar domains are likely caused by browser extensions and are not part of this application. They can usually be ignored for diagnosing dashboard loading issues.</li>
            </ul>
             <p>
                If issues persist after checking these, the server logs are the most crucial source for diagnosing the underlying problem. A successful login that redirects back to the login page usually means the server-side `loginAction` failed (check its logs). A blank dashboard often means data fetching for the dashboard page itself failed (check its server logs).
            </p>
        </CardContent>
     </Card>
  );

  const fetchDashboardData = useCallback(async () => {
    console.log("DashboardPage: Attempting to fetch dashboard analytics...");
    setIsAnalyticsLoading(true);
    setPageError(null); // Reset error at the start of fetch
    try {
      const [analyticsData, topUsersData] = await Promise.all([
        getDashboardAnalytics(),
        getTopUserPostActivity(5) 
      ]);
      
      setAnalytics(analyticsData ?? { totalArticles: 0, articlesToday: 0, totalUsers: 0, activeGadgets: 0, visitorStats: { today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0, activeNow: 0 }, userPostActivity: [] });
      setTopUsersActivity(topUsersData ?? []);
      console.log("DashboardPage: Analytics and top users data fetched successfully.");

    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("DashboardPage: Failed to fetch dashboard analytics:", error);
      toast({ title: "Error", description: `Failed to fetch dashboard analytics: ${msg}`, variant: "destructive" });
      setAnalytics({ totalArticles: 0, articlesToday: 0, totalUsers: 0, activeGadgets: 0, visitorStats: { today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0, activeNow: 0 }, userPostActivity: [] });
      setTopUsersActivity([]);
      setPageError(`Analytics fetch failed: ${msg}. Check server logs for details.`);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [toast]);

  const fetchArticles = useCallback(async () => {
    console.log("DashboardPage: Attempting to fetch articles...");
    setIsLoading(true); // This controls the main article list loading
    // pageError is reset by fetchDashboardData or the combined fetch effect
    try {
      const fetchedArticles = await getAllNewsArticles();
      const safeArticles = Array.isArray(fetchedArticles) ? fetchedArticles : [];
      setArticles(safeArticles.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()));
      console.log("DashboardPage: Articles fetched successfully.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("DashboardPage: Failed to fetch articles:", error);
      toast({ title: "Error", description: `Failed to fetch articles: ${msg}`, variant: "destructive" });
      setArticles([]);
      setPageError(`Articles fetch failed: ${msg}. Check server logs for details.`);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    console.log("DashboardPage: useEffect for initial data fetch triggered.");
    setPageError(null); // Clear any previous page errors
    Promise.allSettled([fetchDashboardData(), fetchArticles()])
      .then(results => {
        results.forEach(result => {
          if (result.status === 'rejected') {
            console.error("DashboardPage: Error during one of the initial data fetches:", result.reason);
            // Page error will be set by individual fetch functions if they fail
          }
        });
      })
      .catch(err => {
        console.error("DashboardPage: Unexpected error during initial data fetch Promise.allSettled:", err);
        setPageError("An unexpected error occurred during initial page load. Check console and server logs.");
      })
      .finally(() => {
        console.log("DashboardPage: Initial data fetch process completed (settled).");
      });
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
        await Promise.all([fetchArticles(), fetchDashboardData()]);
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
            articleYoutubeUrl: data.articleYoutubeUrl,
            articleFacebookUrl: data.articleFacebookUrl,
            articleMoreLinksUrl: data.articleMoreLinksUrl,
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
            articleYoutubeUrl: data.articleYoutubeUrl,
            articleFacebookUrl: data.articleFacebookUrl,
            articleMoreLinksUrl: data.articleMoreLinksUrl,
         };
        const result = await addNewsArticle(createData);
         if (result) {
            toast({ title: "Success", description: "Article added successfully." });
        } else {
            toast({ title: "Error", description: "Failed to add article.", variant: "destructive" });
        }
      }
      await Promise.all([fetchArticles(), fetchDashboardData()]);
      setIsAddEditDialogOpen(false);
      setEditingArticle(null);
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
       console.error("Error saving article:", error);
       toast({ title: "Error", description: `An error occurred while saving the article: ${errorMessage}`, variant: "destructive" });
       setPageError(`Saving article failed: ${errorMessage}. Check server logs.`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const DashboardContent = () => {
    if (pageError || isLoading || isAnalyticsLoading) {
      return (
        <div className="container mx-auto py-8">
          {pageError && <ErrorExplanationCard />}
          {(isLoading || isAnalyticsLoading) && !pageError && (
            <div className="flex items-center justify-center min-h-[calc(100vh-20rem)]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-lg text-muted-foreground">Loading dashboard data...</p>
            </div>
          )}
           {pageError && !isLoading && !isAnalyticsLoading && (
             <p className="text-center text-destructive mt-8">
               Dashboard could not be fully loaded due to the error mentioned above.
             </p>
          )}
        </div>
      );
    }
    return (
      <div className="container mx-auto py-8">
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
                
                <AnalyticsCard title="Visitors Today" value={analytics.visitorStats?.today?.toString() ?? "N/A"} icon={Eye} description="Requires tracking setup" />
                <AnalyticsCard title="Active Visitors Now" value={analytics.visitorStats?.activeNow?.toString() ?? "N/A"} icon={Activity} description="Requires tracking setup" />
                <AnalyticsCard title="Visitors This Week" value={analytics.visitorStats?.thisWeek?.toString() ?? "N/A"} icon={Eye} description="Requires tracking setup" />
                <AnalyticsCard title="Visitors This Month" value={analytics.visitorStats?.thisMonth?.toString() ?? "N/A"} icon={Eye} description="Requires tracking setup" />
              </div>
            ) : (
               <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            )}
          </CardContent>
        </Card>
        
        {topUsersActivity.length > 0 && (
          <Card className="shadow-lg rounded-xl mb-8">
              <CardHeader>
                  <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                      <Users /> Top User Activity
                  </CardTitle>
                  <CardDescription>Most active users by post count (requires authorId tracking on articles).</CardDescription>
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
            {articles.length === 0 && !isLoading ? ( 
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
                      <TableCell>{article.publishedDate ? formatInTimeZone(new Date(article.publishedDate), DHAKA_TIMEZONE, "MMM d, yyyy, h:mm a zzz") : 'N/A'}</TableCell>
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
                Are you sure you want to delete the article &amp;quot;{articleToDelete?.title}&amp;quot;? This action cannot be undone.
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
  };

  return (
    <ErrorBoundary 
      fallback={
        <div className="container mx-auto p-4 py-8 text-center">
          <Card className="w-full max-w-md mx-auto shadow-lg border-destructive">
            <CardHeader className="bg-destructive/10">
              <CardTitle className="text-xl text-destructive flex items-center justify-center">
                <AlertTriangle className="mr-2 h-6 w-6" />
                Dashboard Error
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                The dashboard encountered an error and could not be loaded. Please try reloading the page.
                If the problem persists, check the browser console for more details or contact support.
              </p>
              <Button className="mt-4" onClick={() => window.location.reload()}>Reload Page</Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <DashboardContent />
    </ErrorBoundary>
  );
}
