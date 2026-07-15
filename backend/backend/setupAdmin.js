import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import User from './src/models/User.js';

dotenv.config();

const setupAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'admin@kosmico.com'; // You can change this
    const adminPassword = 'adminpassword123'; // You can change this

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log('Admin user already exists. Updating password and permissions...');
      admin.isAdmin = true;
      admin.password = adminPassword;
      await admin.save();
    } else {
      console.log('Creating new Admin user...');
      admin = new User({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        isAdmin: true,
      });
      await admin.save();
    }

    console.log('\n✅ Admin Setup Complete!');
    console.log('---------------------------------');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('---------------------------------');
    console.log('You can now use these credentials to login via the /api/admin/login API.');
    
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

setupAdmin();
