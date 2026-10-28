import mongoose from 'mongoose';

const insightSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['ACHIEVEMENT', 'WARNING', 'TREND', 'ANOMALY', 'TIP', 'INFO'],
      default: 'INFO',
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'info',
    },
    metric: {
      type: String,
      default: '',
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    category: {
      type: String,
      enum: ['nutrition', 'exercise', 'hydration', 'sleep', 'medical', 'lifestyle'],
      default: 'lifestyle',
    },
    title: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
  },
  { _id: false }
);

const analysisResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    analysisType: {
      type: String,
      enum: [
        'daily_summary',
        'weekly_report',
        'glucose_trend',
        'bp_trend',
        'activity_score',
        'ai_health_score',
        'overall',
      ],
      default: 'overall',
      index: true,
    },
    scores: {
      healthScore: { type: Number, default: 0, min: 0, max: 100 },
      activityScore: { type: Number, default: 0, min: 0, max: 100 },
      hydrationScore: { type: Number, default: 0, min: 0, max: 100 },
      vitalScore: { type: Number, default: 0, min: 0, max: 100 },
      consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    insights: [insightSchema],
    recommendations: [recommendationSchema],
    trends: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

analysisResultSchema.index({ user: 1, date: -1 });
analysisResultSchema.index({ user: 1, analysisType: 1, createdAt: -1 });

const AnalysisResult = mongoose.model('AnalysisResult', analysisResultSchema);

export default AnalysisResult;
