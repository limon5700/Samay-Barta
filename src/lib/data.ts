
'use server';

import type { NewsArticle, Gadget, CreateGadgetData, LayoutSection, Category, CreateNewsArticleData } from './types';
import { connectToDatabase, ObjectId } from './mongodb';
import { initialSampleNewsArticles } from './constants'; // Keep for potential seeding


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
    inlineAdSnippets: doc.inlineAdSnippets || [], // Ensure it's an array
  };
}

// Helper to map MongoDB document to Gadget type
function mapMongoDocumentToGadget(doc: any): Gadget {
  if (!doc) return null as any;
  return {
    id: doc._id.toHexString(),
    section: doc.section || doc.placement, // Handle old placement field during transition
    title: doc.title,
    content: doc.content || doc.codeSnippet, // Handle old codeSnippet field
    isActive: doc.isActive,
    order: doc.order,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
}

export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  try {
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');
    // Optional: Seeding logic if collection is empty
    const count = await articlesCollection.countDocuments();
    if (count === 0 && initialSampleNewsArticles.length > 0) {
        console.log("Seeding initial news articles...");
        // Map initial data to include Date objects where appropriate
        const articlesToSeed = initialSampleNewsArticles.map(article => ({
            ...article,
            publishedDate: new Date(article.publishedDate), // Convert string date to Date object
            inlineAdSnippets: article.inlineAdSnippets || [],
            id: undefined, // Remove the temporary string ID
            _id: new ObjectId(), // Generate a new ObjectId
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

// --- News Article CRUD ---

export async function addNewsArticle(articleData: CreateNewsArticleData): Promise<NewsArticle | null> {
  try {
    const { db } = await connectToDatabase();
    const newArticleDocument = {
      ...articleData,
      publishedDate: new Date(), // Set publish date on creation
      inlineAdSnippets: articleData.inlineAdSnippets || [], // Ensure array exists
      _id: new ObjectId(), // Explicitly generate ID here if needed, or let MongoDB handle it
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

    // Ensure publishedDate is not accidentally updated here unless explicitly needed
    const updateDoc: any = { ...updates };
    delete updateDoc.publishedDate; // Prevent accidental overwrite of original publish date
    if (updateDoc.inlineAdSnippets === undefined) {
        delete updateDoc.inlineAdSnippets; // Don't set to null if not provided
    } else if (!Array.isArray(updateDoc.inlineAdSnippets)) {
        // Basic validation if needed, ensure it's an array
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

// --- Gadget (Advertisement) CRUD ---

// Renamed from addAdvertisement
export async function addGadget(gadgetData: CreateGadgetData): Promise<Gadget | null> {
  try {
    const { db } = await connectToDatabase();
    const newGadgetDocument = {
      section: gadgetData.section,
      title: gadgetData.title,
      content: gadgetData.content,
      isActive: gadgetData.isActive,
      order: gadgetData.order, // Add order
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

// Renamed from getAllAdvertisements
export async function getAllGadgets(): Promise<Gadget[]> {
  try {
    const { db } = await connectToDatabase();
    // Sort by section first, then by order within the section
    const gadgetsCursor = db.collection('advertisements').find({}).sort({ section: 1, order: 1, createdAt: -1 });
    const gadgetsArray = await gadgetsCursor.toArray();
    return gadgetsArray.map(mapMongoDocumentToGadget);
  } catch (error) {
    console.error("Error fetching all gadgets:", error);
    return [];
  }
}

// Function to get *all* active gadgets for a specific layout section.
// Returns an array of gadgets, ordered by the 'order' field.
// Renamed from getAdsByPlacement
export async function getActiveGadgetsBySection(section: LayoutSection): Promise<Gadget[]> {
  try {
    const { db } = await connectToDatabase();
    let query: any = {
        $or: [ // Match either new 'section' field or old 'placement' field
            { section: section },
            { placement: section }
        ],
        isActive: true
    };

    const gadgetsCursor = db.collection('advertisements').find(query).sort({ order: 1, createdAt: -1 });
    const gadgetsArray = await gadgetsCursor.toArray();
    // console.log(`Found ${gadgetsArray.length} active gadgets for section ${section}`);
    return gadgetsArray.map(mapMongoDocumentToGadget);

  } catch (error) {
    console.error(`Error fetching gadgets for section ${section}:`, error);
    return [];
  }
}


// Renamed from updateAdvertisement
export async function updateGadget(id: string, updates: Partial<Omit<Gadget, 'id' | 'createdAt'>>): Promise<Gadget | null> {
  if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for gadget update:", id);
    return null;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);

    // Prepare the update document, removing fields that shouldn't be directly set
    const updateDoc: any = { ...updates };
    delete updateDoc.createdAt; // Cannot update createdAt
    delete updateDoc.id;      // Cannot update id


    // Handle potential renaming from old fields
    if (updateDoc.placement && !updateDoc.section) {
        updateDoc.section = updateDoc.placement;
        delete updateDoc.placement;
    }
    if (updateDoc.codeSnippet && !updateDoc.content) {
        updateDoc.content = updateDoc.codeSnippet;
        delete updateDoc.codeSnippet;
    }
    // Remove obsolete fields if they somehow sneak in
    delete updateDoc.adType;
    delete updateDoc.imageUrl;
    delete updateDoc.linkUrl;
    delete updateDoc.altText;
    delete updateDoc.articleId; // articleId is removed from the gadget model

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

// Renamed from deleteAdvertisement
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

// --- Helper Functions ---

// Function to get all distinct layout sections currently used by gadgets
export async function getUsedLayoutSections(): Promise<LayoutSection[]> {
    try {
        const { db } = await connectToDatabase();
        // Check both 'section' and 'placement' fields for broader compatibility
        const distinctSections = await db.collection('advertisements').distinct('section') as LayoutSection[];
        const distinctPlacements = await db.collection('advertisements').distinct('placement') as LayoutSection[];
        // Combine and deduplicate
        const allSections = [...new Set([...distinctSections, ...distinctPlacements])];
        return allSections.filter(s => s); // Filter out any null/undefined values
    } catch (error) {
        console.error("Error fetching distinct layout sections:", error);
        return [];
    }
}
