
'use server';

import type { NewsArticle, Advertisement, CreateAdvertisementData } from './types';
import { connectToDatabase, ObjectId } from './mongodb';

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
    imageUrl: doc.imageUrl,
    linkUrl: doc.linkUrl,
    altText: doc.altText,
    isActive: doc.isActive,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
}

export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  try {
    const { db } = await connectToDatabase();
    const articlesCursor = db.collection('articles').find({}).sort({ publishedDate: -1 });
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
      publishedDate: new Date(), 
    };
    const result = await db.collection('articles').insertOne(newArticleDocument);
    if (result.insertedId) {
      const insertedDoc = await db.collection('articles').findOne({ _id: result.insertedId });
      return mapMongoDocumentToNewsArticle(insertedDoc);
    }
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
    };
    const result = await db.collection('advertisements').insertOne(newAdDocument);
    if (result.insertedId) {
      const insertedDoc = await db.collection('advertisements').findOne({ _id: result.insertedId });
      return mapMongoDocumentToAdvertisement(insertedDoc);
    }
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

export async function updateAdvertisement(id: string, updates: Partial<Omit<Advertisement, 'id' | 'createdAt'>>): Promise<Advertisement | null> {
  if (!ObjectId.isValid(id)) {
    console.error("Invalid ID for ad update:", id);
    return null;
  }
  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(id);
    const result = await db.collection('advertisements').findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
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
