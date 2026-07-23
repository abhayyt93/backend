import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import Category from './src/models/Category.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB. Fixing categories back to ID...');
  
  const products = await Product.find({});
  let count = 0;
  for (let p of products) {
    if (p.category && !p.category.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a string name
      let catDoc = await Category.findOne({ name: { $regex: new RegExp(`^${p.category}$`, 'i') } });
      if (!catDoc) {
        catDoc = await Category.create({ name: p.category });
      }
      p.category = catDoc._id.toString();
      await p.save();
      console.log(`Updated ${p.name} category to ${catDoc._id.toString()}`);
      count++;
    }
  }
  
  console.log(`Finished. Updated ${count} products.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
