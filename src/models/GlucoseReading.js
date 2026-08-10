import mongoose from 'mongoose';

const glucoseReadingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    glucoseLevel: {
      type: Number,
      required: [true, 'Please add a glucose level in mg/dL'],
    },
    readingTime: {
      type: Date,
      required: [true, 'Please add the time of the reading'],
      default: Date.now,
    },
    timeOfDay: {
      type: String,
      enum: ['Dawn', 'Day', 'Dusk', 'Night'],
      required: [true, 'Please select a time of day'],
    },
    readingType: {
      type: String,
      enum: ['Fasting', 'Post-Meal', 'Random', 'Before-Meal'],
      default: 'Random',
    },
    notes: {
      type: String,
      default: '',
    }
  },
  {
    timestamps: true,
  }
);

const GlucoseReading = mongoose.model('GlucoseReading', glucoseReadingSchema);

export default GlucoseReading;
