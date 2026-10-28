import mongoose from 'mongoose';

const userNotificationPreferencesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Categories and triggers
    categories: {
      hydration: {
        enabled: { type: Boolean, default: true },
        frequencyHours: { type: Number, default: 2, min: 1, max: 12 },
      },
      inactivity: {
        enabled: { type: Boolean, default: true },
        idleThresholdMinutes: { type: Number, default: 90, min: 30, max: 300 },
      },
      glucoseAlerts: {
        enabled: { type: Boolean, default: true },
        highThreshold: { type: Number, default: 180 },
        lowThreshold: { type: Number, default: 70 },
      },
      bpAlerts: {
        enabled: { type: Boolean, default: true },
        systolicHigh: { type: Number, default: 140 },
        diastolicHigh: { type: Number, default: 90 },
      },
      stepGoals: {
        enabled: { type: Boolean, default: true },
        reminderHour: { type: Number, default: 20 }, // 8:00 PM
      },
      waterGoals: {
        enabled: { type: Boolean, default: true },
        reminderHour: { type: Number, default: 19 }, // 7:00 PM
      },
      dailySummary: {
        enabled: { type: Boolean, default: true },
        summaryHour: { type: Number, default: 21 }, // 9:00 PM
      },
      morningMotivation: {
        enabled: { type: Boolean, default: true },
        sendHour: { type: Number, default: 8 }, // 8:00 AM
      },
      medication: {
        enabled: { type: Boolean, default: true },
      },
      weeklyReport: {
        enabled: { type: Boolean, default: true },
        dayOfWeek: { type: Number, default: 0 }, // 0 = Sunday
      },
      healthTips: {
        enabled: { type: Boolean, default: true },
      },
      promotions: {
        enabled: { type: Boolean, default: true },
      },
    },
    // Quiet hours configuration
    quietHours: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: '22:00' }, // 24-hr format (10:00 PM)
      end: { type: String, default: '07:00' },   // 24-hr format (7:00 AM)
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    // Delivery channels
    channels: {
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },
    // Metadata for frequency limiting
    lastSentTimestamps: {
      hydration: { type: Date },
      inactivity: { type: Date },
      glucoseAlert: { type: Date },
      bpAlert: { type: Date },
      stepGoal: { type: Date },
      waterGoal: { type: Date },
      dailySummary: { type: Date },
      morningMotivation: { type: Date },
      medication: { type: Date },
      weeklyReport: { type: Date },
      healthTips: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Method to determine if current time is within user's quiet hours
userNotificationPreferencesSchema.methods.isInQuietHours = function (now = new Date()) {
  if (!this.quietHours || !this.quietHours.enabled) {
    return false;
  }

  try {
    const tz = this.quietHours.timezone || 'Asia/Kolkata';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTimeStr = formatter.format(now); // "HH:MM"

    const [currentHour, currentMin] = currentTimeStr.split(':').map(Number);
    const [startHour, startMin] = (this.quietHours.start || '22:00').split(':').map(Number);
    const [endHour, endMin] = (this.quietHours.end || '07:00').split(':').map(Number);

    const currentTotal = currentHour * 60 + currentMin;
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    if (startTotal <= endTotal) {
      // Non-overnight range (e.g. 13:00 to 15:00)
      return currentTotal >= startTotal && currentTotal < endTotal;
    } else {
      // Overnight range (e.g. 22:00 to 07:00)
      return currentTotal >= startTotal || currentTotal < endTotal;
    }
  } catch (err) {
    console.error('Error evaluating quiet hours:', err);
    return false;
  }
};

const UserNotificationPreferences = mongoose.model(
  'UserNotificationPreferences',
  userNotificationPreferencesSchema
);

export default UserNotificationPreferences;
