import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const appConfigSchema = new mongoose.Schema({
  platform: String,
  is_active: Boolean
});

const AppConfig = mongoose.model('AppConfig', appConfigSchema, 'appconfigs'); // specify collection name if needed

async function disableUpdate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await AppConfig.updateMany({}, { $set: { is_active: false } });
    console.log("Success! is_active set to false.");
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

disableUpdate();
