'use server';

import type { NewsArticle, Category } from './types';
import { connectToDatabase, ObjectId } from './mongodb';
// import { v4 as uuidv4 } from 'uuid'; // Keep for client-side generation if needed, but _id from mongo is primary

export const categories: Category[] = ["Technology", "Sports", "Business", "World", "Entertainment"];

// This can be used for seeding if DB is empty, but primary data source is now MongoDB
export const initialSampleNewsArticles: NewsArticle[] = [
    {
    id: '1', // Will be replaced by MongoDB _id
    title: 'Groundbreaking AI Model Released by Tech Giant',
    content: 'A major technology corporation today unveiled a new artificial intelligence model that promises to revolutionize natural language processing. The model, named "Phoenix-7B", boasts an unprecedented number_of_parameters and has demonstrated superior performance in a variety of benchmarks, including text generation, translation, and question answering. Experts believe this could pave the way for more sophisticated AI applications in the near future. The company plans to offer API access to developers starting next quarter.',
    excerpt: 'A new AI model, Phoenix-7B, has been released, promising to revolutionize natural language processing with its advanced capabilities.',
    category: 'Technology',
    publishedDate: '2024-07-28T10:00:00Z',
    imageUrl: 'https://picsum.photos/seed/tech1/400/200',
    dataAiHint: 'circuit board',
  },
  {
    id: '2',
    title: 'National Team Secures Victory in World Championship',
    content: 'The national football team clinched a historic victory in the World Championship finals last night after a thrilling match that went into extra time. The winning goal, scored in the 115th minute, sent fans into a frenzy. This marks the team\'s first championship title in over two decades. Celebrations are expected to continue throughout the week across the country. The team captain dedicated the win to their passionate supporters.',
    excerpt: 'The national football team won the World Championship in a thrilling final match, marking their first title in decades.',
    category: 'Sports',
    publishedDate: '2024-07-27T22:30:00Z',
    imageUrl: 'https://picsum.photos/seed/sports1/400/200',
    dataAiHint: 'stadium lights',
  },
  // ... (keep other initial articles if needed for reference/seeding)
  {
    id: '3',
    title: 'Stock Market Hits Record High Amidst Positive Economic Indicators',
    content: 'Global stock markets reached new all-time highs this week, fueled by strong corporate earnings reports and positive economic data. Investor confidence appears to be on the rise despite ongoing geopolitical tensions. Analysts suggest that sectors like technology and renewable energy are leading the charge. However, some caution that a market correction could be on the horizon as valuations become stretched.',
    excerpt: 'Global stock markets hit record highs, driven by strong earnings and positive economic news, particularly in tech and renewables.',
    category: 'Business',
    publishedDate: '2024-07-26T15:45:00Z',
    imageUrl: 'https://picsum.photos/seed/business1/400/200',
    dataAiHint: 'city skyline',
  },
  {
    id: '4',
    title: 'International Summit Addresses Climate Change Goals',
    content: 'Leaders from around the world gathered for an international summit focused on tackling climate change. Discussions centered on renewing commitments to reduce carbon emissions and invest in green technologies. While some progress was made, activists argue that the pledges are still insufficient to meet the urgency of the crisis. The summit concluded with a joint declaration outlining future steps and cooperation efforts.',
    excerpt: 'World leaders met at an international summit to discuss climate change, renewing emission reduction commitments.',
    category: 'World',
    publishedDate: '2024-07-25T12:00:00Z',
    imageUrl: 'https://picsum.photos/seed/world1/400/200',
    dataAiHint: 'earth globe',
  },
  {
    id: '5',
    title: 'New Sci-Fi Blockbuster Dominates Summer Box Office',
    content: 'The latest science fiction epic, "Galaxy Wanderers", has taken the summer box office by storm, raking in over $300 million globally in its opening weekend. Directed by acclaimed filmmaker Anya Sharma, the film features stunning visual effects and a compelling storyline that has resonated with audiences and critics alike. It is projected to be one of the highest-grossing films of the year.',
    excerpt: 'Sci-fi blockbuster "Galaxy Wanderers" is dominating the box office with over $300 million in its opening weekend.',
    category: 'Entertainment',
    publishedDate: '2024-07-24T18:00:00Z',
    imageUrl: 'https://picsum.photos/seed/entertainment1/400/200',
    dataAiHint: 'movie theater',
  },
  {
    id: '6',
    title: 'Advancements in Quantum Computing Promise Faster Processing',
    content: 'Researchers have announced a significant breakthrough in quantum computing that could lead to processors capable of speeds unimaginable with current technology. This development focuses on qubit stability and error correction, two major hurdles in the field. While commercial quantum computers are still some years away, this progress accelerates the timeline for their potential impact on science, medicine, and cryptography.',
    excerpt: 'A breakthrough in quantum computing could lead to significantly faster processors, focusing on qubit stability and error correction.',
    category: 'Technology',
    publishedDate: '2024-07-23T09:15:00Z',
    imageUrl: 'https://picsum.photos/seed/tech2/400/200',
    dataAiHint: 'abstract tech',
  },
  {
    id: '7',
    title: 'Local Athlete Smashes National Record in Marathon',
    content: 'Hometown hero Alex Rivera smashed the national marathon record at yesterday\'s city marathon, finishing with an astonishing time of 2 hours and 5 minutes. Rivera, who trained relentlessly for this event, attributed the success to a new training regimen and unwavering community support. The previous record had stood for 15 years.',
    excerpt: 'Local athlete Alex Rivera broke the national marathon record with a time of 2:05, attributing success to new training and support.',
    category: 'Sports',
    publishedDate: '2024-07-22T14:00:00Z',
    imageUrl: 'https://picsum.photos/seed/sports2/400/200',
    dataAiHint: 'running track',
  },
];


const ARTICLES_COLLECTION = 'articles';

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
    const articlesCursor = db.collection(ARTICLES_COLLECTION).find({}).sort({ publishedDate: -1 });
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
    const result = await db.collection(ARTICLES_COLLECTION).insertOne(newArticleDocument);
    if (result.insertedId) {
      // Fetch the inserted document to return it in NewsArticle format
      const insertedDoc = await db.collection(ARTICLES_COLLECTION).findOne({ _id: result.insertedId });
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

    const result = await db.collection(ARTICLES_COLLECTION).findOneAndUpdate(
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
    const result = await db.collection(ARTICLES_COLLECTION).deleteOne({ _id: objectId });
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
    const articleDoc = await db.collection(ARTICLES_COLLECTION).findOne({ _id: objectId });
    return articleDoc ? mapMongoDocumentToNewsArticle(articleDoc) : null;
  } catch (error) {
    console.error("Error fetching article by ID:", error);
    return null;
  }
}
