import mongoose from 'mongoose';

const stepLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Normalized calendar date in 'YYYY-MM-DD' format (e.g., '2026-10-19')
    date: {
      type: String,
      required: true,
      index: true,
    },
    steps: {
      type: Number,
      default: 0,
      min: [0, 'Steps cannot be negative'],
    },
    distance: {
      type: Number, // in kilometers
      default: 0,
      min: 0,
    },
    calories: {
      type: Number, // in kcal
      default: 0,
      min: 0,
    },
    activeMinutes: {
      type: Number, // in minutes
      default: 0,
      min: 0,
    },
    goal: {
      type: Number, // daily step goal
      default: 10000,
    },
    waterIntake: {
      type: Number, // in ml
      default: 0,
      min: 0,
    },
    waterGoal: {
      type: Number, // daily water goal in ml
      default: 2000,
      min: 0,
    },
    source: {
      type: String,
      enum: ['manual', 'sensor', 'smartwatch', 'hybrid'],
      default: 'manual',
    },
    bp: {
      systolic: { type: Number, default: 118 },
      diastolic: { type: Number, default: 76 },
    },
    avgGlucose: {
      type: Number,
    },
    // Micro logs when steps are added incrementally
    logs: [
      {
        addedSteps: { type: Number, required: true },
        source: { type: String, default: 'manual' },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// One step log document per user per day
stepLogSchema.index({ user: 1, date: 1 }, { unique: true });
stepLogSchema.index({ user: 1, createdAt: -1 });

const StepLog = mongoose.model('StepLog', stepLogSchema);

export default StepLog;
