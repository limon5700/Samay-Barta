
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Info, ShieldCheck, UserPlus, KeyRound, ListChecks } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UserManagementPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Users /> User & Role Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions for the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700">
              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-700 dark:text-yellow-300">Feature Under Development</AlertTitle>
              <AlertDescription className="text-yellow-600 dark:text-yellow-400 space-y-1">
                <p>A comprehensive User and Role Management system with granular permissions is planned for future updates.</p>
                <p><strong>Current System:</strong> Authentication is managed by a single administrator account defined via <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD</code> environment variables. This administrator has full access to all features.</p>
                <p>The sections below outline the planned functionality for a multi-user system.</p>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck /> Planned: Role Definitions</CardTitle>
                        <CardDescription>Define distinct roles with specific sets of permissions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm mb-2">Example roles to be implemented:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li><strong>Administrator:</strong> Full control over the site, including user management, settings, and all content.</li>
                            <li><strong>Editor:</strong> Can create, edit, publish, and delete articles. May manage categories. Cannot manage users or site-wide settings.</li>
                            <li><strong>Author:</strong> Can create and edit their own articles (drafts). Cannot publish or delete articles.</li>
                            <li><strong>SEO Specialist:</strong> Can access and modify global SEO settings and article-specific SEO fields. May not have article content editing rights.</li>
                        </ul>
                         <p className="mt-3 text-xs text-muted-foreground">This functionality is not yet implemented.</p>
                    </CardContent>
                </Card>
                 <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><ListChecks /> Planned: Permission System</CardTitle>
                        <CardDescription>Granular control over what actions users can perform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm mb-2">Example permissions to be assigned to roles:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li><code>manage_articles_all</code>: Create, edit, delete any article.</li>
                            <li><code>manage_articles_own</code>: Create, edit own articles.</li>
                            <li><code>publish_articles</code>: Approve and publish articles.</li>
                            <li><code>manage_users</code>: Add, edit, delete users, assign roles.</li>
                            <li><code>manage_roles</code>: Define and modify roles and their permissions.</li>
                            <li><code>manage_layout_gadgets</code>: Edit site layout and add/remove gadgets.</li>
                            <li><code>manage_seo_global</code>: Access and modify global SEO settings.</li>
                            <li><code>manage_seo_article</code>: Modify SEO settings for individual articles.</li>
                            <li><code>view_admin_dashboard</code>: Basic access to view the admin dashboard.</li>
                        </ul>
                        <p className="mt-3 text-xs text-muted-foreground">This functionality is not yet implemented.</p>
                    </CardContent>
                </Card>
                 <Card className="bg-muted/30 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><UserPlus /> Planned: User Account Management</CardTitle>
                        <CardDescription>Tools for administering user accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Invite new users via email or create accounts directly.</li>
                            <li>Assign one or more roles to each user.</li>
                            <li>Activate/deactivate user accounts.</li>
                            <li>Secure password management, including hashed storage and password reset functionalities.</li>
                            <li>Dashboard sections and specific actions within pages will be restricted based on the logged-in user's assigned roles and permissions.</li>
                            <li>Future: Audit logs for tracking important user actions within the admin panel.</li>
                        </ul>
                        <p className="mt-3 text-xs text-muted-foreground">This functionality is not yet implemented.</p>
                    </CardContent>
                </Card>
            </div>
             <div className="text-center mt-8">
                 <Button variant="outline" disabled>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Manage Users & Roles (Coming Soon)
                 </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

