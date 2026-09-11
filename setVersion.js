import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AppConfig from './src/models/AppConfig.js';

dotenv.config();

const updateConfig = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    await AppConfig.findOneAndUpdate(
      { platform: 'android' },
      {
        latest_version: '1.0.3',
        min_required_version: '1.0.0',
        force_update: false,
        playstore_url: 'https://play.google.com/store/apps/details?id=com.kosmico.wellness'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Android config updated to 1.0.3');

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

updateConfig();
