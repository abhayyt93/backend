import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Admin from '../src/models/Admin.js';

dotenv.config({ path: '../.env' });

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const admin = await Admin.findOne();
    if (!admin) return console.log('No admin');
    
    const token = jwt.sign({ id: admin._id.toString() }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    const productId = '6ab0e364a4055d1ffd6a9f68';
    
    const response = await fetch(`http://localhost:5000/api/admin/products/admin/update-product/${productId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ visibility: true })
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Body: ${text}`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};
runTest();
