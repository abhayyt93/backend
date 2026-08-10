import mongoose from 'mongoose';

const mealLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mealType: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
      required: [true, 'Please specify the meal type'],
    },
    carbs: {
      type: Number,
      required: [true, 'Please add the amount of carbs in grams'],
    },
    logTime: {
      type: Date,
      required: [true, 'Please add the time of the meal'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Logged', 'Pending'],
      default: 'Logged',
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

const MealLog = mongoose.model('MealLog', mealLogSchema);

export default MealLog;
