import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    subscriptionAmount: {
      type: Number,
      default: 149,
      required: true
    },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
