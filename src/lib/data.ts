
'use server';

import type { NewsArticle, Gadget, CreateGadgetData, LayoutSection, Category, CreateNewsArticleData, SeoSettings, CreateSeoSettingsData, DashboardAnalytics } from './types';
import { connectToDatabase, ObjectId } from './mongodb';
import { initialSampleNewsArticles } from './constants'; 
// User/Role related imports and functions are removed

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
    // authorId removed
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

export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  try {
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');
    
    const query: any = {};
    // Removed authorId specific query params

    const count = await articlesCollection.countDocuments(query);
    if (count === 0 && initialSampleNewsArticles.length > 0) {
        console.log("Seeding initial news articles...");
        const articlesToSeed = initialSampleNewsArticles.map(article => {
            const { id, authorId, ...restOfArticle } = article; // Exclude frontend 'id' and 'authorId'
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
    // authorId is removed as auth is disabled
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
    delete updateDoc.authorId; // Remove authorId from updates

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
        return {
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
        return { 
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
        
        const updatedDocument = result || (result && (result as any).value);

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

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  try {
    const articlesStats = await getArticlesStats();
    const activeGadgets = await getActiveGadgetsCount();

    // User-related stats are removed as authentication is disabled
    const visitorStats = {
      today: 0, 
      activeNow: 0,
      thisWeek: 0,
      thisMonth: 0,
      lastMonth: 0,
    };

    return {
      totalArticles: articlesStats.totalArticles,
      articlesToday: articlesStats.articlesToday,
      activeGadgets,
      visitorStats,
    };
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return {
      totalArticles: 0,
      articlesToday: 0,
      activeGadgets: 0,
      visitorStats: { today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0 },
    };
  }
}
