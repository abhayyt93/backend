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
    
    console.log(`Token generated for user: ${user._id}`);
    
    // Add a dummy method directly to DB to test deletion via API
    user.savedPaymentMethods.push({
      type: 'UPI',
      upiId: 'test_api_delete@upi',
      displayName: 'API Delete Test'
    });
    const savedUser = await user.save();
    const methodId = savedUser.savedPaymentMethods[savedUser.savedPaymentMethods.length - 1]._id.toString();
    console.log(`Added test method to DB directly. ID: ${methodId}`);
    
    // Test Delete API on LIVE SERVER
    console.log('Hitting LIVE DELETE API...');
    const delResponse = await fetch(`http://3.7.180.215/api/payment/save-method/${methodId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const delJson = await delResponse.json();
    console.log(`DELETE API Status: ${delResponse.status}`, delJson);

    // Verify in DB
    const updatedUser = await User.findById(user._id);
    const exists = updatedUser.savedPaymentMethods.some(m => m._id.toString() === methodId);
    console.log(`Does method still exist in DB? ${exists}`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};
runTest();
