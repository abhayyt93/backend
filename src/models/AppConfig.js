import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: [true, 'Please add a platform'],
      enum: ['android', 'ios'],
      unique: true,
    },
    latest_version: {
      type: String,
      required: [true, 'Please add the latest version'],
    },
    min_required_version: {
      type: String,
      required: [true, 'Please add the minimum required version'],
    },
    force_update: {
      type: Boolean,
      default: false,
    },
    playstore_url: {
      type: String,
      default: 'https://play.google.com/store/apps/details?id=com.kosmico.wellness',
    },
  },
  {
    timestamps: true,
  }
);

const AppConfig = mongoose.model('AppConfig', appConfigSchema);

export default AppConfig;
