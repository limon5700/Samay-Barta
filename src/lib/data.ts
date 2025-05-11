'use server';

import type { NewsArticle } from './types';
import { connectToDatabase, ObjectId } from './mongodb';

// Helper to map MongoDB document to NewsArticle type
function mapMongoDocumentToNewsArticle(doc: any): NewsArticle {
  if (!doc) return null as any; // Should not happen if doc exists
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

export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  try {
    const { db } = await connectToDatabase();
    const articlesCursor = db.collection('articles').find({}).sort({ publishedDate: -1 });
    const articlesArray = await articlesCursor.toArray();
    return articlesArray.map(mapMongoDocumentToNewsArticle);
  } catch (error) {
    console.error("Error fetching all news articles:", error);
    // It's often better to throw the error or handle it more gracefully
    // than returning potentially misleading empty data.
    // For now, returning empty array as per original logic.
    return []; 
  }
}


export type CreateNewsArticleData = Omit<NewsArticle, 'id' | 'publishedDate'>;

export async function addNewsArticle(articleData: CreateNewsArticleData): Promise<NewsArticle | null> {
  try {
    const { db } = await connectToDatabase();
    const newArticleDocument = {
      ...articleData,
      publishedDate: new Date(), // Store as Date object
      // MongoDB will auto-generate _id
    };
    const result = await db.collection('articles').insertOne(newArticleDocument);
    if (result.insertedId) {
      // Fetch the inserted document to return it in NewsArticle format
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
    
    // Ensure publishedDate is not accidentally overwritten if not in updates
    const updateDoc: any = { ...updates };
    delete updateDoc.publishedDate; // Remove publishedDate from updates if present, it shouldn't change here

    const result = await db.collection('articles').findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: 'after' } // Returns the updated document
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
