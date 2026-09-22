import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

import Product from '../src/models/Product.js';

// Helper function to save Base64 image to disk
const saveBase64Image = (base64String) => {
  try {
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const filename = `product-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
    const uploadPath = path.join(process.cwd(), 'uploads', filename);
    fs.writeFileSync(uploadPath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Error saving base64 image:", err.message);
    return null;
  }
};

const runMigration = async () => {
  try {
    console.log('Starting Base64 Image Migration...');
    const baseUrl = `https://api.kosmicowellness.com`; // Live server URL
    
    // Find all products where image starts with 'data:image'
    const products = await Product.find({ image: { $regex: '^data:image' } });
    console.log(`Found ${products.length} products with Base64 images.`);

    for (const product of products) {
      console.log(`Processing product: ${product.name}`);
      const savedPath = saveBase64Image(product.image);
      
      if (savedPath) {
        const fullUrl = `${baseUrl}${savedPath}`;
        product.image = fullUrl;
        product.images = [fullUrl];
        await product.save();
        console.log(`✅ Fixed image for ${product.name}`);
      } else {
        console.log(`❌ Failed to parse Base64 for ${product.name}`);
      }
    }
    
    console.log('Migration Complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
