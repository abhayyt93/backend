import mongoose from 'mongoose';

const notificationHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'hydration',
        'inactivity',
        'glucose',
        'bp',
        'step_goal',
        'water_goal',
        'daily_summary',
        'morning_motivation',
        'medication',
        'weekly_report',
        'health_tip',
        'system',
        'promotional',
        'ai_insight',
      ],
      default: 'system',
      index: true,
    },
    type: {
      type: String,
      default: 'ALERT', // ALERT, REMINDER, REPORT, MOTIVATION, PROMO
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
      default: 'sent',
      index: true,
    },
    channel: {
      type: String,
      enum: ['push', 'in_app', 'both', 'sms', 'email'],
      default: 'both',
    },
    fcmMessageId: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    error: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

notificationHistorySchema.index({ user: 1, createdAt: -1 });
notificationHistorySchema.index({ user: 1, category: 1, createdAt: -1 });
notificationHistorySchema.index({ user: 1, isRead: 1 });

const NotificationHistory = mongoose.model('NotificationHistory', notificationHistorySchema);

export default NotificationHistory;
