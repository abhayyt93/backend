import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const migrateLeads = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is missing in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { family: 4 });
    console.log('Connected to MongoDB successfully.');

    const db = mongoose.connection.db;

    // Check if 'leads' collection exists
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    const collectionExists = collectionNames.includes('leads');

    if (!collectionExists) {
      console.log("Collection 'leads' does not exist. Creating it now...");
      await db.createCollection('leads');
      console.log("Collection 'leads' created successfully.");
    } else {
      console.log("Collection 'leads' already exists.");
    }

    const leadsCollection = db.collection('leads');

    // Create Indexes
    console.log('Ensuring indexes on leads collection...');
    
    // Index on phoneNumber for fast duplicate checking and search
    await leadsCollection.createIndex({ phoneNumber: 1 }, { name: 'phoneNumber_1', background: true });
    
    // Index on createdAt for fast sorting & pagination
    await leadsCollection.createIndex({ createdAt: -1 }, { name: 'createdAt_-1', background: true });
    
    // Compound index for phoneNumber & createdAt
    await leadsCollection.createIndex({ phoneNumber: 1, createdAt: -1 }, { name: 'phoneNumber_1_createdAt_-1', background: true });

    // Index on source
    await leadsCollection.createIndex({ source: 1 }, { name: 'source_1', background: true });

    const currentIndexes = await leadsCollection.indexes();
    console.log('Current indexes on leads collection:');
    console.log(JSON.stringify(currentIndexes, null, 2));

    console.log('Migration completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

migrateLeads();
