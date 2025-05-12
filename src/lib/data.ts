
'use server';

import type { NewsArticle, Advertisement, CreateAdvertisementData, AdPlacement, Category } from './types';
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
  };
}

// Helper to map MongoDB document to Advertisement type
function mapMongoDocumentToAdvertisement(doc: any): Advertisement {
  if (!doc) return null as any;
  return {
    id: doc._id.toHexString(),
    placement: doc.placement,
    adType: doc.adType,
    imageUrl: doc.imageUrl,
    linkUrl: doc.linkUrl,
    altText: doc.altText,
    codeSnippet: doc.codeSnippet,
    isActive: doc.isActive,
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


export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'>;

export async function addNewsArticle(articleData: CreateNewsArticleData): Promise<NewsArticle | null> {
  try {
    const { db } = await connectToDatabase();
    const newArticleDocument = {
      ...articleData,
      publishedDate: new Date(), // Set publish date on creation
      _id: new ObjectId(), // Explicitly generate ID here if needed, or let MongoDB handle it
    };
    const result = await db.collection('articles').insertOne(newArticleDocument);
    
    // Check if acknowledged and use the correct ID reference
    if (result.acknowledged && newArticleDocument._id) {
      // Fetch the inserted document using the generated _id
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

// Advertisement CRUD operations
export async function addAdvertisement(adData: CreateAdvertisementData): Promise<Advertisement | null> {
  try {
    const { db } = await connectToDatabase();
    const newAdDocument = {
      ...adData,
      createdAt: new Date(),
      _id: new ObjectId(),
    };
    const result = await db.collection('advertisements').insertOne(newAdDocument);
     if (result.acknowledged && newAdDocument._id) {
      const insertedDoc = await db.collection('advertisements').findOne({ _id: newAdDocument._id });
      return mapMongoDocumentToAdvertisement(insertedDoc);
    }
    console.error("Failed to insert advertisement or retrieve inserted ID.");
    return null;
  } catch (error) {
    console.error("Error adding advertisement:", error);
    return null;
  }
}

export async function getAllAdvertisements(): Promise<Advertisement[]> {
  try {
    const { db } = await connectToDatabase();
    const adsCursor = db.collection('advertisements').find({}).sort({ createdAt: -1 });
    const adsArray = await adsCursor.toArray();
    return adsArray.map(mapMongoDocumentToAdvertisement);
  } catch (error) {
    console.error("Error fetching all advertisements:", error);
    return [];
  }
}

// Function to get active ads for a specific placement
export async function getAdsByPlacement(placement: AdPlacement): Promise<Advertisement[]> {
  try {
    const { db } = await connectToDatabase();
    const adsCursor = db.collection('advertisements').find({ 
        placement: placement, 
        isActive: true 
    }).sort({ createdAt: -1 }); // Sort or maybe randomize?
    const adsArray = await adsCursor.toArray();
    return adsArray.map(mapMongoDocumentToAdvertisement);
  } catch (error) {
    console.error(`Error fetching ads for placement ${placement}:`, error);
    return [];
  }
}


export async function updateAdvertisement(id: string, updates: Partial<Omit<Advertisement, 'id' | 'createdAt'>>): Promise<Advertisement | null> {
  if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for ad update:", id);
    return null;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    
    // Ensure createdAt is not accidentally updated
    const updateDoc: any = { ...updates };
    delete updateDoc.createdAt; 

    const result = await db.collection('advertisements').findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );
    return result ? mapMongoDocumentToAdvertisement(result) : null;
  } catch (error) {
    console.error("Error updating advertisement:", error);
    return null;
  }
}

export async function deleteAdvertisement(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for ad delete:", id);
    return false;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    const result = await db.collection('advertisements').deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  } catch (error) {
    console.error("Error deleting advertisement:", error);
    return false;
  }
}
