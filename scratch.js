import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB');
    const Order = mongoose.connection.collection('orders');
    const latestOrder = await Order.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    console.log('LATEST ORDER:', JSON.stringify(latestOrder, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
