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
    // Categories and triggers (Supports instant, 30m, 1h, 2h, daily, weekly)
    categories: {
      // 1. Water Intake / Hydration
      hydration: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: '2h' }, // instant, 30m, 1h, 2h, daily, weekly
        frequencyHours: { type: Number, default: 2, min: 0 },
      },
      waterGoals: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
        reminderHour: { type: Number, default: 19 }, // 7:00 PM
      },
      waterIntake: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: '2h' },
        frequencyHours: { type: Number, default: 2, min: 0 },
      },

      // 2. Step Count / Movement
      inactivity: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: '90m' },
        idleThresholdMinutes: { type: Number, default: 90, min: 0 },
      },
      stepGoals: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
        reminderHour: { type: Number, default: 20 }, // 8:00 PM
      },
      stepCount: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
        reminderHour: { type: Number, default: 20 },
      },

      // 3. Blood Pressure
      bpAlerts: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'instant' }, // Default real-time
        frequencyHours: { type: Number, default: 0, min: 0 },
        systolicHigh: { type: Number, default: 140 },
        diastolicHigh: { type: Number, default: 90 },
      },
      bloodPressure: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'instant' },
        frequencyHours: { type: Number, default: 0, min: 0 },
      },

      // 4. Glucose Alerts
      glucoseAlerts: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'instant' },
        highThreshold: { type: Number, default: 180 },
        lowThreshold: { type: Number, default: 70 },
      },

      // 5. Plate Scan (Food & Nutrition analysis alerts)
      plateScan: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'instant' }, // instant, 30m, 1h, 2h, daily, weekly
        frequencyHours: { type: Number, default: 0, min: 0 },
      },

      // 6. Promos & Announcements
      promotions: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
        frequencyHours: { type: Number, default: 24, min: 0 },
      },
      promos: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
        frequencyHours: { type: Number, default: 24, min: 0 },
      },

      // 7. Order Updates (Shipping, delivery, tracking alerts)
      orderUpdates: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'instant' }, // instant, 30m, 1h, 2h, daily, weekly
        frequencyHours: { type: Number, default: 0, min: 0 },
      },

      // 8. Other Health Schedules
      dailySummary: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
        summaryHour: { type: Number, default: 21 }, // 9:00 PM
      },
      morningMotivation: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
        sendHour: { type: Number, default: 8 }, // 8:00 AM
      },
      medication: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
      },
      weeklyReport: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'weekly' },
        dayOfWeek: { type: Number, default: 0 }, // 0 = Sunday
      },
      healthTips: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' },
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
      plateScan: { type: Date },
      orderUpdates: { type: Date },
      promotions: { type: Date },
      dailySummary: { type: Date },
      morningMotivation: { type: Date },
      medication: { type: Date },
      weeklyReport: { type: Date },
      healthTips: { type: Date },
    },
  },
  {
    timestamps: true,
    strict: false, // Allows flexible categories & custom admin options without dropping fields
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
