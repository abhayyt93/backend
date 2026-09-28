import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    console.log('Fetching products...');
    const products = await db.collection('products').find({}).toArray();
    console.log(`Found ${products.length} products.`);
    
    let updatedCount = 0;
    
    for (const p of products) {
      const update = {};
      
      // Fix missing image
      if (!p.image) {
        if (p.images && p.images.length > 0) {
          update.image = p.images[0];
        } else {
          update.image = '/images/sample.jpg';
        }
      }
      
      // Fix countInStock
      if (p.countInStock === undefined && p.stock !== undefined) {
        update.countInStock = p.stock;
      }
      
      // Fix ingredients (Array -> String)
      if (Array.isArray(p.ingredients)) {
        update.ingredients = p.ingredients.join(', ');
      }
      
      if (Object.keys(update).length > 0) {
        await db.collection('products').updateOne({ _id: p._id }, { $set: update });
        updatedCount++;
      }
    }
    
    console.log(`Successfully migrated ${updatedCount} products.`);
    mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

runMigration();
