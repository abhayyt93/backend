import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StepLog from './src/models/StepLog.js';
import User from './src/models/User.js';

dotenv.config();

async function cleanBiomarkers() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('No MONGO_URI in process.env');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Reset StepLog bp if systolic is 118 and diastolic is 76 and isManualOrScanned is falsy
    const resultStepLogs = await StepLog.updateMany(
      {
        'bp.systolic': 118,
        'bp.diastolic': 76,
        'bp.isManualOrScanned': { $ne: true },
      },
      {
        $set: {
          'bp.systolic': 0,
          'bp.diastolic': 0,
          'bp.pulse': 0,
        },
      }
    );
    console.log('Updated StepLogs count:', resultStepLogs.modifiedCount);

    // 2. Clean User dailyActivities where systolic is 118 and diastolic is 76
    const users = await User.find({
      $or: [
        { 'dailyActivities.bp.systolic': 118 },
        { 'dailyActivities.systolic': 118 },
      ],
    });

    console.log(`Found ${users.length} users with dailyActivities having 118 systolic`);

    for (const u of users) {
      let changed = false;
      if (Array.isArray(u.dailyActivities)) {
        for (const act of u.dailyActivities) {
          if (act.bp && act.bp.systolic === 118 && act.bp.diastolic === 76 && !act.bp.isManualOrScanned) {
            act.bp.systolic = 0;
            act.bp.diastolic = 0;
            act.bp.pulse = 0;
            changed = true;
          }
          if (act.systolic === 118 && act.diastolic === 76) {
            act.systolic = 0;
            act.diastolic = 0;
            changed = true;
          }
        }
      }
      if (changed) {
        await u.save();
        console.log(`Cleaned user ${u.name || u._id}`);
      }
    }

    console.log('Biomarkers cleanup completed successfully!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanBiomarkers();
