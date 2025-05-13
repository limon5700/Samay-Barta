
'use server';

import type { NewsArticle, Gadget, CreateGadgetData, LayoutSection, Category, CreateNewsArticleData, SeoSettings, CreateSeoSettingsData } from './types';
import { connectToDatabase, ObjectId } from './mongodb';
import { initialSampleNewsArticles } from './constants'; 


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
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    };
}


export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  try {
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');
    const count = await articlesCollection.countDocuments();
    if (count === 0 && initialSampleNewsArticles.length > 0) {
        console.log("Seeding initial news articles...");
        const articlesToSeed = initialSampleNewsArticles.map(article => ({
            ...article,
            publishedDate: new Date(article.publishedDate), 
            inlineAdSnippets: article.inlineAdSnippets || [],
            id: undefined, 
            _id: new ObjectId(), 
        }));
        await articlesCollection.insertMany(articlesToSeed);
        console.log(`${articlesToSeed.length} articles seeded.`);
    }

    const articlesCursor = articlesCollection.find({}).sort({ publishedDate: -1 });
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


// --- SEO Settings ---
// Placeholder functions for SEO settings.
// In a real application, this would interact with a 'seo_settings' collection.

const SEO_SETTINGS_ID = "global_seo_settings"; // Use a fixed ID for the single SEO settings document

export async function getSeoSettings(): Promise<SeoSettings | null> {
    console.log("Attempting to get SEO settings (placeholder).");
    // try {
    //     const { db } = await connectToDatabase();
    //     const settingsDoc = await db.collection('seo_settings').findOne({ _id: new ObjectId(SEO_SETTINGS_ID) }); // Or a fixed known ID
    //     return settingsDoc ? mapMongoDocumentToSeoSettings(settingsDoc) : null;
    // } catch (error) {
    //     console.error("Error fetching SEO settings:", error);
    //     return null;
    // }
    // Mock implementation:
    return {
        id: SEO_SETTINGS_ID,
        siteTitle: "Samay Barta Lite - Default Title",
        metaDescription: "Your concise news source, powered by AI.",
        metaKeywords: ["news", "bangla news", "ai news"],
        faviconUrl: "/favicon.ico", // Default favicon path
        updatedAt: new Date().toISOString(),
    };
}

export async function updateSeoSettings(settingsData: CreateSeoSettingsData): Promise<SeoSettings | null> {
    console.log("Attempting to update SEO settings (placeholder):", settingsData);
    // try {
    //     const { db } = await connectToDatabase();
    //     const updateDoc = {
    //         ...settingsData,
    //         updatedAt: new Date(),
    //     };
    //     const result = await db.collection('seo_settings').findOneAndUpdate(
    //         { _id: new ObjectId(SEO_SETTINGS_ID) }, // Or a fixed known ID
    //         { $set: updateDoc },
    //         { upsert: true, returnDocument: 'after' } // Create if it doesn't exist
    //     );
    //     return result ? mapMongoDocumentToSeoSettings(result) : null;
    // } catch (error) {
    //     console.error("Error updating SEO settings:", error);
    //     return null;
    // }
    // Mock implementation:
     const mockUpdatedSettings: SeoSettings = {
        id: SEO_SETTINGS_ID,
        ...settingsData,
        metaKeywords: settingsData.metaKeywords || [],
        updatedAt: new Date().toISOString(),
    };
    return mockUpdatedSettings;
}


// --- Helper Functions ---
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
