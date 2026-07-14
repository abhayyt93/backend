import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function testSave() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kosmico');
  
  // Find Shubham or any user
  const user = await User.findOne({ name: /shubham/i }) || await User.findOne();
  if (!user) {
    console.log("No user found");
    process.exit(1);
  }
  
  console.log("User before:", user.savedPaymentMethods);
  
  user.savedPaymentMethods.push({
    type: 'UPI',
    upiId: 'test@okicici',
    displayName: 'Test Name'
  });
  
  const saved = await user.save();
  console.log("User after save:", saved.savedPaymentMethods);
  process.exit(0);
}

testSave().catch(console.error);
