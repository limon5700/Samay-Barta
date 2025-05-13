
import { MongoClient, Db, ServerApiVersion, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env. It should start with "mongodb://" or "mongodb+srv://".'
  );
}

if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error(
        'Invalid MONGODB_URI scheme. The connection string must start with "mongodb://" or "mongodb+srv://". Please check your .env file.'
    );
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
    // Ensure the client is still connected before returning cache
    try {
      // Ping the database to check connection status
      // Using admin command as it's lightweight and always available
      await cachedDb.admin().ping();
    } catch (error) {
      console.warn("Cached MongoDB connection lost, attempting to reconnect.", error);
      cachedClient = null;
      cachedDb = null;
      // Fall through to reconnect
    }
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }
  }
  
  if (!MONGODB_URI) { // This check is now somewhat redundant due to the top-level check, but good for safety.
    throw new Error(
      'MONGODB_URI is not defined. Please set it in your .env file.'
    );
  }
   if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error(
        'Invalid MONGODB_URI scheme. The connection string must start with "mongodb://" or "mongodb+srv://". Please check your .env file.'
    );
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
    // Extract database name from URI if present, otherwise use a default or handle error
    let dbName;
    try {
        const url = new URL(MONGODB_URI);
        dbName = url.pathname.substring(1).split('/')[0]; // Get the first path segment as DB name
        if (!dbName && (MONGODB_URI.startsWith('mongodb+srv') || MONGODB_URI.startsWith('mongodb://'))) {
            // For srv strings, db name might not be in path, or for mongodb:// it might be optional
            // User needs to ensure DB name is part of connection string or specify it
            console.warn("Database name not found in MONGODB_URI path. Ensure it's configured in the connection string or MongoClient options.");
            // Attempt to use a default or a DB specified in options if applicable.
            // For this setup, we'll rely on the URI or default behavior of the driver.
        }
    } catch (e) {
        console.error("Could not parse MONGODB_URI to extract database name:", e);
        // Proceeding without a dbName explicitly passed to client.db() means driver might use 'test' or one from URI
    }

    const db = client.db(dbName); // If dbName is undefined, driver might use default or URI-specified DB.
    
    cachedClient = client;
    cachedDb = db;

    console.log("Successfully connected to MongoDB.");
    return { client, db };
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    // If connection fails, ensure client is closed to prevent resource leaks
    if (client && typeof client.close === 'function') {
        await client.close();
    }
    throw error; // Re-throw error after logging and cleanup
  }
}

export { ObjectId };

