
'use server';

import type { NewsArticle, Gadget, CreateGadgetData, LayoutSection, Category, CreateNewsArticleData, SeoSettings, CreateSeoSettingsData, DashboardAnalytics, User, Role, Permission, CreateUserData, CreateRoleData, UpdateUserData, CreateActivityLogData, ActivityLogEntry, UserActivity } from './types';
import { connectToDatabase, ObjectId } from './mongodb';
import { initialSampleNewsArticles, availablePermissions } from './constants';
import bcrypt from 'bcryptjs';

// Helper to map MongoDB document to NewsArticle type
function mapMongoDocumentToNewsArticle(doc: any): NewsArticle {
  if (!doc) return null as any;
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    content: doc.content,
    excerpt: doc.excerpt,
    category: doc.category,
    publishedDate: doc.publishedDate instanceof Date ? doc.publishedDate.toISOString() : doc.publishedDate,
    imageUrl: doc.imageUrl,
    dataAiHint: doc.dataAiHint,
    inlineAdSnippets: doc.inlineAdSnippets || [],
    authorId: doc.authorId,
    metaTitle: doc.metaTitle,
    metaDescription: doc.metaDescription,
    metaKeywords: doc.metaKeywords || [],
    ogTitle: doc.ogTitle,
    ogDescription: doc.ogDescription,
    ogImage: doc.ogImage,
    canonicalUrl: doc.canonicalUrl,
    articleYoutubeUrl: doc.articleYoutubeUrl,
    articleFacebookUrl: doc.articleFacebookUrl,
    articleMoreLinksUrl: doc.articleMoreLinksUrl,
  };
}

// Helper to map MongoDB document to Gadget type
function mapMongoDocumentToGadget(doc: any): Gadget {
  if (!doc) return null as any;
  return {
    id: doc._id.toHexString(),
    section: doc.section || doc.placement,
    title: doc.title,
    content: doc.content || doc.codeSnippet,
    isActive: doc.isActive,
    order: doc.order,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
}

// Helper to map MongoDB document to SeoSettings type
function mapMongoDocumentToSeoSettings(doc: any): SeoSettings {
    if (!doc) return null as any;
    return {
        id: doc._id.toHexString(),
        siteTitle: doc.siteTitle,
        metaDescription: doc.metaDescription,
        metaKeywords: doc.metaKeywords || [],
        faviconUrl: doc.faviconUrl,
        ogSiteName: doc.ogSiteName,
        ogLocale: doc.ogLocale,
        ogType: doc.ogType,
        twitterCard: doc.twitterCard,
        twitterSite: doc.twitterSite,
        twitterCreator: doc.twitterCreator,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
        footerYoutubeUrl: doc.footerYoutubeUrl,
        footerFacebookUrl: doc.footerFacebookUrl,
        footerMoreLinksUrl: doc.footerMoreLinksUrl,
    };
}

// Helper to map MongoDB document to User type
function mapMongoDocumentToUser(doc: any): User | null {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    username: doc.username,
    email: doc.email,
    passwordHash: doc.passwordHash,
    roles: doc.roles || [], // Array of role IDs
    isActive: doc.isActive,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined,
  };
}

// Helper to map MongoDB document to Role type
function mapMongoDocumentToRole(doc: any): Role | null {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    description: doc.description,
    permissions: doc.permissions || [],
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined,
  };
}

// Helper to map MongoDB document to ActivityLogEntry type
function mapMongoDocumentToActivityLog(doc: any): ActivityLogEntry | null {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    userId: doc.userId,
    username: doc.username,
    action: doc.action,
    targetType: doc.targetType,
    targetId: doc.targetId,
    details: doc.details,
    timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp,
  };
}


export async function getAllNewsArticles(authorId?: string): Promise<NewsArticle[]> {
  try {
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');

    const query: any = {};
    if (authorId && authorId !== 'SUPERADMIN_ENV') { // Superadmin sees all
        query.authorId = authorId;
    }

    const count = await articlesCollection.countDocuments(); // Count all, then seed if empty
    if (count === 0 && initialSampleNewsArticles.length > 0) {
        console.log("Seeding initial news articles...");
        const articlesToSeed = initialSampleNewsArticles.map(article => {
            const { id, ...restOfArticle } = article; // Exclude frontend 'id'
            return {
                ...restOfArticle,
                publishedDate: new Date(article.publishedDate),
                inlineAdSnippets: article.inlineAdSnippets || [],
                metaTitle: article.metaTitle || '',
                metaDescription: article.metaDescription || '',
                metaKeywords: article.metaKeywords || [],
                ogTitle: article.ogTitle || '',
                ogDescription: article.ogDescription || '',
                ogImage: article.ogImage || '',
                canonicalUrl: article.canonicalUrl || '',
                articleYoutubeUrl: article.articleYoutubeUrl || '',
                articleFacebookUrl: article.articleFacebookUrl || '',
                articleMoreLinksUrl: article.articleMoreLinksUrl || '',
                _id: new ObjectId(),
            };
        });
        await articlesCollection.insertMany(articlesToSeed);
        console.log(`${articlesToSeed.length} articles seeded.`);
    }

    const articlesCursor = articlesCollection.find(query).sort({ publishedDate: -1 });
    const articlesArray = await articlesCursor.toArray();
    return articlesArray.map(mapMongoDocumentToNewsArticle);
  } catch (error) {
    console.error("Error fetching all news articles:", error);
    return [];
  }
}

export async function addNewsArticle(articleData: CreateNewsArticleData): Promise<NewsArticle | null> {
  try {
    const { db } = await connectToDatabase();
    const newArticleDocument = {
      ...articleData,
      publishedDate: new Date(),
      inlineAdSnippets: articleData.inlineAdSnippets || [],
      metaKeywords: Array.isArray(articleData.metaKeywords) ? articleData.metaKeywords : (articleData.metaKeywords ? (articleData.metaKeywords as unknown as string).split(',').map(k => k.trim()).filter(k => k) : []),
      articleYoutubeUrl: articleData.articleYoutubeUrl || undefined,
      articleFacebookUrl: articleData.articleFacebookUrl || undefined,
      articleMoreLinksUrl: articleData.articleMoreLinksUrl || undefined,
      _id: new ObjectId(),
    };
    const result = await db.collection('articles').insertOne(newArticleDocument);

    if (result.acknowledged && newArticleDocument._id) {
      const insertedDoc = await db.collection('articles').findOne({ _id: newArticleDocument._id });
      return mapMongoDocumentToNewsArticle(insertedDoc);
    }
    console.error("Failed to insert article or retrieve inserted ID.");
    return null;
  } catch (error) {
    console.error("Error adding news article:", error);
    return null;
  }
}

export async function updateNewsArticle(id: string, updates: Partial<Omit<NewsArticle, 'id' | 'publishedDate'>>): Promise<NewsArticle | null> {
  if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for update:", id);
    return null;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);

    const updateDoc: any = { ...updates };
    delete updateDoc.publishedDate;

    if (updateDoc.inlineAdSnippets === undefined) {
        delete updateDoc.inlineAdSnippets;
    } else if (!Array.isArray(updateDoc.inlineAdSnippets)) {
        updateDoc.inlineAdSnippets = [];
    }
    if (updates.metaKeywords && !Array.isArray(updates.metaKeywords)) {
        updateDoc.metaKeywords = (updates.metaKeywords as unknown as string).split(',').map(k => k.trim()).filter(k => k);
    }
    if (updates.articleYoutubeUrl !== undefined) updateDoc.articleYoutubeUrl = updates.articleYoutubeUrl;
    if (updates.articleFacebookUrl !== undefined) updateDoc.articleFacebookUrl = updates.articleFacebookUrl;
    if (updates.articleMoreLinksUrl !== undefined) updateDoc.articleMoreLinksUrl = updates.articleMoreLinksUrl;

    const result = await db.collection('articles').findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );
    return result ? mapMongoDocumentToNewsArticle(result) : null;
  } catch (error) {
    console.error("Error updating news article:", error);
    return null;
  }
}

export async function deleteNewsArticle(id: string): Promise<boolean> {
   if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for delete:", id);
    return false;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    const result = await db.collection('articles').deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  } catch (error) {
    console.error("Error deleting news article:", error);
    return false;
  }
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  if (!ObjectId.isValid(id)) {
    console.warn("Attempted to fetch article with invalid ID format:", id);
    return null;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    const articleDoc = await db.collection('articles').findOne({ _id: objectId });
    return articleDoc ? mapMongoDocumentToNewsArticle(articleDoc) : null;
  } catch (error) {
    console.error("Error fetching article by ID:", error);
    return null;
  }
}

export async function addGadget(gadgetData: CreateGadgetData): Promise<Gadget | null> {
  try {
    const { db } = await connectToDatabase();
    const newGadgetDocument = {
      section: gadgetData.section,
      title: gadgetData.title,
      content: gadgetData.content,
      isActive: gadgetData.isActive,
      order: gadgetData.order,
      createdAt: new Date(),
      _id: new ObjectId(),
    };

    const result = await db.collection('advertisements').insertOne(newGadgetDocument);
     if (result.acknowledged && newGadgetDocument._id) {
      const insertedDoc = await db.collection('advertisements').findOne({ _id: newGadgetDocument._id });
      return mapMongoDocumentToGadget(insertedDoc);
    }
    console.error("Failed to insert gadget or retrieve inserted ID.");
    return null;
  } catch (error) {
    console.error("Error adding gadget:", error);
    return null;
  }
}

export async function getAllGadgets(): Promise<Gadget[]> {
  try {
    const { db } = await connectToDatabase();
    const gadgetsCursor = db.collection('advertisements').find({}).sort({ section: 1, order: 1, createdAt: -1 });
    const gadgetsArray = await gadgetsCursor.toArray();
    return gadgetsArray.map(mapMongoDocumentToGadget);
  } catch (error) {
    console.error("Error fetching all gadgets:", error);
    return [];
  }
}

export async function getActiveGadgetsBySection(section: LayoutSection): Promise<Gadget[]> {
  try {
    const { db } = await connectToDatabase();
    let query: any = {
        $or: [
            { section: section },
            { placement: section }
        ],
        isActive: true
    };

    const gadgetsCursor = db.collection('advertisements').find(query).sort({ order: 1, createdAt: -1 });
    const gadgetsArray = await gadgetsCursor.toArray();
    return gadgetsArray.map(mapMongoDocumentToGadget);

  } catch (error) {
    console.error(`Error fetching gadgets for section ${section}:`, error);
    return [];
  }
}

export async function updateGadget(id: string, updates: Partial<Omit<Gadget, 'id' | 'createdAt'>>): Promise<Gadget | null> {
  if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for gadget update:", id);
    return null;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);

    const updateDoc: any = { ...updates };
    delete updateDoc.createdAt;
    delete updateDoc.id;

    if (updateDoc.placement && !updateDoc.section) {
        updateDoc.section = updateDoc.placement;
        delete updateDoc.placement;
    }
    if (updateDoc.codeSnippet && !updateDoc.content) {
        updateDoc.content = updateDoc.codeSnippet;
        delete updateDoc.codeSnippet;
    }
    delete updateDoc.adType;
    delete updateDoc.imageUrl;
    delete updateDoc.linkUrl;
    delete updateDoc.altText;
    delete updateDoc.articleId;

    const result = await db.collection('advertisements').findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );
    return result ? mapMongoDocumentToGadget(result) : null;
  } catch (error) {
    console.error("Error updating gadget:", error);
    return null;
  }
}

export async function deleteGadget(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for gadget delete:", id);
    return false;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    const result = await db.collection('advertisements').deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  } catch (error) {
    console.error("Error deleting gadget:", error);
    return false;
  }
}

const GLOBAL_SEO_SETTINGS_DOC_ID = "global_seo_settings_doc";

export async function getSeoSettings(): Promise<SeoSettings | null> {
    try {
        const { db } = await connectToDatabase();
        const settingsDoc = await db.collection('seo_settings').findOne({ _id: GLOBAL_SEO_SETTINGS_DOC_ID });
        if (settingsDoc) {
             return {
                id: settingsDoc._id.toString(),
                siteTitle: settingsDoc.siteTitle,
                metaDescription: settingsDoc.metaDescription,
                metaKeywords: settingsDoc.metaKeywords || [],
                faviconUrl: settingsDoc.faviconUrl,
                ogSiteName: settingsDoc.ogSiteName,
                ogLocale: settingsDoc.ogLocale,
                ogType: settingsDoc.ogType,
                twitterCard: settingsDoc.twitterCard,
                twitterSite: settingsDoc.twitterSite,
                twitterCreator: settingsDoc.twitterCreator,
                updatedAt: settingsDoc.updatedAt instanceof Date ? settingsDoc.updatedAt.toISOString() : settingsDoc.updatedAt,
                footerYoutubeUrl: settingsDoc.footerYoutubeUrl,
                footerFacebookUrl: settingsDoc.footerFacebookUrl,
                footerMoreLinksUrl: settingsDoc.footerMoreLinksUrl,
            };
        }
        return { // Default values if no settings are found
            id: GLOBAL_SEO_SETTINGS_DOC_ID,
            siteTitle: "Samay Barta Lite",
            metaDescription: "Your concise news source, powered by AI.",
            metaKeywords: ["news", "bangla news", "ai news", "latest news"],
            faviconUrl: "/favicon.ico",
            ogSiteName: "Samay Barta Lite",
            ogLocale: "bn_BD",
            ogType: "website",
            twitterCard: "summary_large_image",
            updatedAt: new Date().toISOString(),
            footerYoutubeUrl: "https://youtube.com",
            footerFacebookUrl: "https://facebook.com",
            footerMoreLinksUrl: "#",
        };
    } catch (error) {
        console.error("Error fetching SEO settings:", error);
        return { // Fallback default values on error
            id: GLOBAL_SEO_SETTINGS_DOC_ID,
            siteTitle: "Samay Barta Lite - Default",
            metaDescription: "Default description.",
            metaKeywords: [],
            faviconUrl: "/favicon.ico",
            updatedAt: new Date().toISOString(),
            footerYoutubeUrl: "https://youtube.com",
            footerFacebookUrl: "https://facebook.com",
            footerMoreLinksUrl: "#",
        };
    }
}

export async function updateSeoSettings(settingsData: CreateSeoSettingsData): Promise<SeoSettings | null> {
    try {
        const { db } = await connectToDatabase();
        const updateDoc = {
            ...settingsData,
            metaKeywords: Array.isArray(settingsData.metaKeywords) ? settingsData.metaKeywords : (settingsData.metaKeywords || '').split(',').map(k => k.trim()).filter(k => k),
            updatedAt: new Date(),
            footerYoutubeUrl: settingsData.footerYoutubeUrl || undefined,
            footerFacebookUrl: settingsData.footerFacebookUrl || undefined,
            footerMoreLinksUrl: settingsData.footerMoreLinksUrl || undefined,
        };
        const result = await db.collection('seo_settings').findOneAndUpdate(
            { _id: GLOBAL_SEO_SETTINGS_DOC_ID },
            { $set: updateDoc },
            { upsert: true, returnDocument: 'after' }
        );

        const updatedDocument = result; // In MongoDB Node.js driver v4+, findOneAndUpdate returns the document directly

        if (updatedDocument) {
             return {
                id: updatedDocument._id.toString(),
                siteTitle: updatedDocument.siteTitle,
                metaDescription: updatedDocument.metaDescription,
                metaKeywords: updatedDocument.metaKeywords || [],
                faviconUrl: updatedDocument.faviconUrl,
                ogSiteName: updatedDocument.ogSiteName,
                ogLocale: updatedDocument.ogLocale,
                ogType: updatedDocument.ogType,
                twitterCard: updatedDocument.twitterCard,
                twitterSite: updatedDocument.twitterSite,
                twitterCreator: updatedDocument.twitterCreator,
                updatedAt: updatedDocument.updatedAt instanceof Date ? updatedDocument.updatedAt.toISOString() : updatedDocument.updatedAt,
                footerYoutubeUrl: updatedDocument.footerYoutubeUrl,
                footerFacebookUrl: updatedDocument.footerFacebookUrl,
                footerMoreLinksUrl: updatedDocument.footerMoreLinksUrl,
            };
        }
        return null;
    } catch (error) {
        console.error("Error updating SEO settings:", error);
        return null;
    }
}

export async function getUsedLayoutSections(): Promise<LayoutSection[]> {
    try {
        const { db } = await connectToDatabase();
        const distinctSections = await db.collection('advertisements').distinct('section') as LayoutSection[];
        const distinctPlacements = await db.collection('advertisements').distinct('placement') as LayoutSection[];
        const allSections = [...new Set([...distinctSections, ...distinctPlacements])];
        return allSections.filter(s => s);
    } catch (error) {
        console.error("Error fetching distinct layout sections:", error);
        return [];
    }
}

export async function getArticlesStats(): Promise<{ totalArticles: number; articlesToday: number }> {
  try {
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');

    const totalArticles = await articlesCollection.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const articlesToday = await articlesCollection.countDocuments({
      publishedDate: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    return { totalArticles, articlesToday };
  } catch (error) {
    console.error("Error fetching articles stats:", error);
    return { totalArticles: 0, articlesToday: 0 };
  }
}

export async function getActiveGadgetsCount(): Promise<number> {
  try {
    const { db } = await connectToDatabase();
    const count = await db.collection('advertisements').countDocuments({ isActive: true });
    return count;
  } catch (error) {
    console.error("Error fetching active gadgets count:", error);
    return 0;
  }
}

// User and Role Management Functions
export async function getAllUsers(): Promise<User[]> {
  try {
    const { db } = await connectToDatabase();
    const usersArray = await db.collection('users').find().toArray();
    return usersArray.map(doc => mapMongoDocumentToUser(doc)).filter(user => user !== null) as User[];
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

export async function getUserById(id: string): Promise<User | null> {
  if (!ObjectId.isValid(id)) return null;
  try {
    const { db } = await connectToDatabase();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(id) });
    return userDoc ? mapMongoDocumentToUser(userDoc) : null;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const { db } = await connectToDatabase();
    const userDoc = await db.collection('users').findOne({ username: username });
    return userDoc ? mapMongoDocumentToUser(userDoc) : null;
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return null;
  }
}

export async function addUser(userData: CreateUserData): Promise<User | null> {
  if (!userData.password) {
    console.error("Password is required to create a new user.");
    throw new Error("Password is required.");
  }
  try {
    const { db } = await connectToDatabase();
    const existingUser = await db.collection('users').findOne({ username: userData.username });
    if (existingUser) {
      throw new Error("Username already exists.");
    }
    if(userData.email){
        const existingEmail = await db.collection('users').findOne({ email: userData.email });
        if(existingEmail){
            throw new Error("Email already exists.");
        }
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const newUserDocument = {
      username: userData.username,
      email: userData.email,
      passwordHash: passwordHash,
      roles: userData.roles || [],
      isActive: userData.isActive === undefined ? true : userData.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: new ObjectId(),
    };
    const result = await db.collection('users').insertOne(newUserDocument);
    if (result.acknowledged && newUserDocument._id) {
      const insertedDoc = await db.collection('users').findOne({ _id: newUserDocument._id });
      return mapMongoDocumentToUser(insertedDoc);
    }
    return null;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
}

export async function updateUser(id: string, updates: UpdateUserData): Promise<User | null> {
  if (!ObjectId.isValid(id)) return null;
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    const updateDoc: any = { ...updates };

    if (updates.password) {
      updateDoc.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updateDoc.password;
    }
    updateDoc.updatedAt = new Date();

    const result = await db.collection('users').findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );
    return result ? mapMongoDocumentToUser(result) : null;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

export async function getAllRoles(): Promise<Role[]> {
  try {
    const { db } = await connectToDatabase();
    const rolesArray = await db.collection('roles').find().toArray();
    return rolesArray.map(doc => mapMongoDocumentToRole(doc)).filter(role => role !== null) as Role[];
  } catch (error) {
    console.error("Error fetching all roles:", error);
    return [];
  }
}

export async function getRoleById(id: string): Promise<Role | null> {
  if (!ObjectId.isValid(id)) return null;
  try {
    const { db } = await connectToDatabase();
    const roleDoc = await db.collection('roles').findOne({ _id: new ObjectId(id) });
    return roleDoc ? mapMongoDocumentToRole(roleDoc) : null;
  } catch (error) {
    console.error("Error fetching role by ID:", error);
    return null;
  }
}

export async function addRole(roleData: CreateRoleData): Promise<Role | null> {
  try {
    const { db } = await connectToDatabase();
     const existingRole = await db.collection('roles').findOne({ name: roleData.name });
    if (existingRole) {
      throw new Error("Role name already exists.");
    }
    const newRoleDocument = {
      ...roleData,
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: new ObjectId(),
    };
    const result = await db.collection('roles').insertOne(newRoleDocument);
    if (result.acknowledged && newRoleDocument._id) {
      const insertedDoc = await db.collection('roles').findOne({ _id: newRoleDocument._id });
      return mapMongoDocumentToRole(insertedDoc);
    }
    return null;
  } catch (error) {
    console.error("Error adding role:", error);
    throw error;
  }
}

export async function updateRole(id: string, updates: Partial<CreateRoleData>): Promise<Role | null> {
  if (!ObjectId.isValid(id)) return null;
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    const updateDoc = { ...updates, updatedAt: new Date() };

    const result = await db.collection('roles').findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );
    return result ? mapMongoDocumentToRole(result) : null;
  } catch (error) {
    console.error("Error updating role:", error);
    throw error;
  }
}

export async function deleteRole(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  try {
    const { db } = await connectToDatabase();
    // Optionally, remove this role from all users who have it
    // await db.collection('users').updateMany({ roles: id }, { $pull: { roles: id } });
    const result = await db.collection('roles').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error("Error deleting role:", error);
    return false;
  }
}

export async function getPermissionsForUser(userId: string): Promise<Permission[]> {
  const user = await getUserById(userId);
  if (!user) return [];

  const userPermissions = new Set<Permission>();
  if (user.roles && user.roles.length > 0) {
    const rolesPromises = user.roles.map(roleId => getRoleById(roleId));
    const roles = await Promise.all(rolesPromises);
    roles.forEach(role => {
      if (role && role.permissions) {
        role.permissions.forEach(permission => userPermissions.add(permission));
      }
    });
  }
  return Array.from(userPermissions);
}


export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  try {
    const articlesStats = await getArticlesStats();
    const activeGadgets = await getActiveGadgetsCount();
    const { db } = await connectToDatabase();
    const totalUsers = await db.collection('users').countDocuments();

    // Placeholder visitor stats. A real system would require a separate tracking mechanism.
    const visitorStats = {
      today: 123,         // Sample data
      activeNow: 17,      // Sample data
      thisWeek: 876,      // Sample data
      thisMonth: 3450,    // Sample data
      lastMonth: 4120,    // Sample data
    };

    return {
      totalArticles: articlesStats.totalArticles,
      articlesToday: articlesStats.articlesToday,
      totalUsers,
      activeGadgets,
      visitorStats,
      // userPostActivity: Array.isArray(userPostActivity) ? userPostActivity : [], // Keep commented until fully implemented
    };
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    // Return default/empty values on error
    return {
      totalArticles: 0,
      articlesToday: 0,
      totalUsers: 0,
      activeGadgets: 0,
      visitorStats: { today: 0, activeNow: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0 },
      // userPostActivity: [], // Keep commented until fully implemented
    };
  }
}

// Stub for Activity Log
export async function addActivityLogEntry(logData: CreateActivityLogData): Promise<ActivityLogEntry | null> {
  try {
    const { db } = await connectToDatabase();
    const newLogEntry = {
      ...logData,
      timestamp: new Date(),
      _id: new ObjectId(),
    };
    const result = await db.collection('activity_logs').insertOne(newLogEntry);
    if (result.acknowledged && newLogEntry._id) {
      const insertedDoc = await db.collection('activity_logs').findOne({ _id: newLogEntry._id });
      if (insertedDoc) {
          console.log("Activity logged:", insertedDoc.action, "by", insertedDoc.username);
          return mapMongoDocumentToActivityLog(insertedDoc);
      }
    }
    return null;
  } catch (error) {
    console.error("Error adding activity log entry:", error);
    // Don't throw error here to prevent breaking main operations
    return null;
  }
}

// Stub for fetching user post activity
export async function getTopUserPostActivity(limit: number = 5): Promise<UserActivity[]> {
    console.warn("getTopUserPostActivity is a stub and not fully implemented.");
    return [];
}
    