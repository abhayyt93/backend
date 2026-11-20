import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide phone number'],
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Interested', 'Not Interested', 'Converted', 'Closed'],
      default: 'New'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'leads' // Target existing 'leads' collection
  }
);

// Virtual aliases so responses and consumers can use mobile or phone interchangeably
leadSchema.virtual('mobile').get(function () {
  return this.phoneNumber;
});

leadSchema.virtual('phone').get(function () {
  return this.phoneNumber;
});

leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

// Compound index for queries & sorting
leadSchema.index({ phoneNumber: 1, createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
