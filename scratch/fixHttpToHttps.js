import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import Post from '../src/models/Post.js';

const runMigration = async () => {
  try {
    console.log('Starting HTTP to HTTPS Migration...');
    
    // Fix Users
    const users = await User.find({ profilePicture: { $regex: '^http://api.kosmicowellness.com' } });
    console.log(`Found ${users.length} users with HTTP profile pictures.`);
    for (const user of users) {
      user.profilePicture = user.profilePicture.replace('http://', 'https://');
      await user.save();
    }
    console.log('Users fixed.');

    // Fix Products
    const products = await Product.find({ image: { $regex: '^http://api.kosmicowellness.com' } });
    console.log(`Found ${products.length} products with HTTP images.`);
    for (const product of products) {
      product.image = product.image.replace('http://', 'https://');
      product.images = product.images.map(img => img.replace('http://', 'https://'));
      await product.save();
    }
    console.log('Products fixed.');
    
    // Fix Posts
    const posts = await Post.find({ image: { $regex: '^http://api.kosmicowellness.com' } });
    console.log(`Found ${posts.length} posts with HTTP images.`);
    for (const post of posts) {
      post.image = post.image.replace('http://', 'https://');
      await post.save();
    }
    console.log('Posts fixed.');

    console.log('Migration Complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
