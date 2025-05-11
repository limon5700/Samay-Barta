
import { MongoClient, Db, ServerApiVersion, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections from growing exponentially
// during API Route usage.
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<MongoConnection> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1); // Extract db name from URI
    const db = client.db(dbName);
    
    cachedClient = client;
    cachedDb = db;

    console.log("Successfully connected to MongoDB.");
    return { client, db };
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    // If connection fails, ensure client is closed to prevent resource leaks
    await client.close();
    throw error; // Re-throw error after logging and cleanup
  }
}

export { ObjectId };
