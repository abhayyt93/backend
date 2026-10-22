import mongoose from 'mongoose';

const clinicalReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reportType: {
      type: String,
      default: '7-Day Metabolic & Glycemic Clinical Summary',
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    patient: {
      name: { type: String, default: 'Valued Patient' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    summaryMetrics: {
      avgGlucose: { type: Number, default: 118.0 },
      estHbA1c: { type: Number, default: 5.75 },
      timeInRangePercentage: { type: Number, default: 82.0 },
      totalStepsWeek: { type: Number, default: 0 },
      avgStepsDaily: { type: Number, default: 0 },
      totalWaterWeekMl: { type: Number, default: 0 },
      avgWaterDailyMl: { type: Number, default: 0 },
      avgSystolicBp: { type: Number, default: 118 },
      avgDiastolicBp: { type: Number, default: 76 },
    },
    dailyBreakdown: [
      {
        date: { type: String, required: true },
        day: { type: String, required: true },
        steps: { type: Number, default: 0 },
        waterIntake: { type: Number, default: 0 },
        avgGlucose: { type: Number, default: 118.0 },
        bp: {
          systolic: { type: Number, default: 118 },
          diastolic: { type: Number, default: 76 },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ClinicalReport = mongoose.model('ClinicalReport', clinicalReportSchema);

export default ClinicalReport;
