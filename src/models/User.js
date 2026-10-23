import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    appVersion: {
      type: String,
      default: '',
    },
    platform: {
      type: String,
      default: 'android',
    },
    savedPaymentMethods: [
      {
        type: {
          type: String,
          enum: ['UPI', 'BANK_ACCOUNT'],
          required: true,
        },
        // For UPI
        upiId: { type: String },
        displayName: { type: String },

        // For Bank Account
        accountHolderName: { type: String },
        bankName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },

        isDefault: { type: Boolean, default: false }
      }
    ],
    isBlocked: {
      type: Boolean,
      default: false
    },
    password: {
      type: String
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isSubscribed: {
      type: Boolean,
      default: false
    },
    subscriptionActivatedAt: {
      type: Date
    },
    subscriptionPaymentId: {
      type: String
    },
    subscriptionDetails: {
      orderId: String,
      paymentId: String,
      signature: String,
      subscribedAt: Date
    },
    trialUsage: {
      plate_scan: { type: Number, default: 0 },
      bp_scan: { type: Number, default: 0 },
      community_post: { type: Number, default: 0 },
      smartwatch_connect: { type: Number, default: 0 }
    },
    stepGoal: {
      type: Number,
      default: 10000
    },
    todaySteps: {
      type: Number,
      default: 0
    },
    lastStepDate: {
      type: String,
      default: ''
    },
    todayWater: {
      type: Number,
      default: 0
    },
    waterGoal: {
      type: Number,
      default: 2000
    },
    dailyActivities: [
      {
        date: { type: String, required: true },
        steps: { type: Number, default: 0 },
        waterIntake: { type: Number, default: 0 },
        waterGoal: { type: Number, default: 2000 },
        distance: { type: Number, default: 0 },
        calories: { type: Number, default: 0 },
        activeMinutes: { type: Number, default: 0 },
        stepGoal: { type: Number, default: 10000 },
        goal: { type: Number, default: 10000 },
        bp: {
          systolic: { type: Number, default: 0 },
          diastolic: { type: Number, default: 0 },
          pulse: { type: Number, default: 0 },
        },
        systolic: { type: Number, default: 0 },
        diastolic: { type: Number, default: 0 },
        pulse: { type: Number, default: 0 },
        bloodPressure: { type: String, default: '0/0' },
        carbs: { type: Number, default: 0 },
        carbsIntake: { type: Number, default: 0 },
        stressScore: { type: Number, default: 0 },
        stress: { type: Number, default: 0 },
        moodAndEnergy: { type: Number, default: 0 },
        energyLevel: { type: Number, default: 0 },
        energy: { type: Number, default: 0 },
        mood: { type: Number, default: 0 },
        avgGlucose: { type: Number, default: 0 },
        source: { type: String, default: 'sensor' },
        updatedAt: { type: Date, default: Date.now },
      }
    ],
    fcmToken: {
      type: String,
      default: ''
    },
    fcmPlatform: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
  }
);

// Method to match entered password with hashed password in DB
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    next();
  } else {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  }
});

// Method to check subscription validity and calculate days left
userSchema.methods.checkSubscriptionValidity = async function () {
  if (!this.isSubscribed) {
    return { isSubscribed: false, daysLeft: 0 };
  }

  if (this.subscriptionActivatedAt) {
    const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const activatedAt = new Date(this.subscriptionActivatedAt);
    const diff = now.getTime() - activatedAt.getTime();

    if (diff > thirtyDaysInMillis) {
      // Expired
      this.isSubscribed = false;
      await this.save();
      return { isSubscribed: false, daysLeft: 0 };
    } else {
      // Valid
      const remainingMillis = thirtyDaysInMillis - diff;
      const daysLeft = Math.ceil(remainingMillis / (1000 * 60 * 60 * 24));
      return { isSubscribed: true, daysLeft };
    }
  }

  // If isSubscribed is true but no activatedAt date exists, assume it was activated now.
  this.subscriptionActivatedAt = new Date();
  await this.save();
  return { isSubscribed: true, daysLeft: 30 };
};

const User = mongoose.model('User', userSchema);

export default User;
