import mongoose from 'mongoose';

const whatsAppTemplateSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'MARKETING',
      trim: true,
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    status: {
      type: String,
      default: 'APPROVED',
      enum: ['APPROVED', 'PENDING', 'REJECTED'],
    },
    referenceId: {
      type: String,
      default: '',
      trim: true,
    },
    variablesCount: {
      type: Number,
      default: 0,
    },
    variableLabels: {
      type: [String],
      default: [],
    },
    variableExamples: {
      type: [String],
      default: [],
    },
    previewText: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const WhatsAppTemplate = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);

export default WhatsAppTemplate;

