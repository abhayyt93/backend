import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ name: /shubham/i }) || await User.findOne();
    if (!user) return console.log('No user');
    
    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    // Add method
    user.savedPaymentMethods.push({
      type: 'UPI',
      upiId: 'update_test@upi',
      displayName: 'Before Update'
    });
    const savedUser = await user.save();
    const methodId = savedUser.savedPaymentMethods[savedUser.savedPaymentMethods.length - 1]._id.toString();
    console.log(`Added ID: ${methodId}`);
    
    // Update API
    const response = await fetch(`http://3.7.180.215/api/payment/save-method/${methodId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ displayName: 'AFTER UPDATE' })
    });
    console.log(`UPDATE API Status: ${response.status}`);
    
    const updatedUser = await User.findById(user._id);
    const updatedMethod = updatedUser.savedPaymentMethods.find(m => m._id.toString() === methodId);
    console.log(`Updated Name in DB: ${updatedMethod.displayName}`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};
runTest();
