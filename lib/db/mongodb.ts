import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stock_market_ai';
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 2000, // Quick timeout for local resilience
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let isConnected = false;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      if (!clientPromise) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
      }
    }

    const connectedClient = await clientPromise;
    isConnected = true;
    return connectedClient;
  } catch (error) {
    isConnected = false;
    // Log once and return null so the resilient fallback store takes over
    console.warn('[MongoDB] Direct connection unavailable, activating resilient local store:', (error as Error).message);
    return null;
  }
}

export async function getMongoDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db();
}

export function isMongoConnected(): boolean {
  return isConnected;
}
