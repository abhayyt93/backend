import mongoose from 'mongoose';
import User from '../models/User.js';
import WhatsAppTemplate from '../models/WhatsAppTemplate.js';
import {
  normalizeWhatsAppNumber,
  sendWhatsAppTemplate,
  WhatsAppApiError,
} from '../services/whatsappService.js';

const getOptionalString = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new WhatsAppApiError(`${fieldName} must be a string`, 400);
  }
  return value.trim();
};

// Default fallback templates if DB is empty
const DEFAULT_FALLBACK_TEMPLATES = [
  {
    templateName: 'kosmico_general_offer',
    displayName: 'General Offer / Promotion',
    category: 'MARKETING',
    language: 'en',
    status: 'APPROVED',
    referenceId: '1f1e62db-95dc-446c-957d-c1def1e01af2',
    variablesCount: 6,
    variableLabels: [
      'User Name',
      'Product / Offer Title',
      'Discount %',
      'Coupon Code',
      'Offer Expiry Date',
      'Website / Shop Link'
    ],
    variableExamples: [
      'Abhay',
      'Special Wellness Pack',
      '20',
      'KOSMICO20',
      '10 Nov',
      'kosmicowellness.com'
    ],
    previewText: 'Hello {{1}}! 👋\nGood news from Kosmico Wellness!\n{{2}} is now available for you.\nGet an exclusive discount of {{3}}% on your purchase.\nUse Coupon Code: {{4}}\nOffer valid until: {{5}}\nShop Now: {{6}}\nDon\'t miss this special offer!\nReply STOP if you no longer wish to receive promotional messages.'
  }
];

// @desc    Get all available approved WhatsApp templates for Admin Panel
// @route   GET /admin/whatsapp/templates OR GET /api/admin/whatsapp/templates
// @access  Private (Admin)
export const getWhatsAppTemplates = async (req, res, next) => {
  try {
    let templates = await WhatsAppTemplate.find({ isActive: true }).sort({ createdAt: -1 });

    if (!templates || templates.length === 0) {
      // Seed default template if DB is empty
      await WhatsAppTemplate.insertMany(DEFAULT_FALLBACK_TEMPLATES).catch(() => {});
      templates = await WhatsAppTemplate.find({ isActive: true });
    }

    return res.status(200).json({
      success: true,
      count: templates.length,
      templates: templates.map((t) => ({
        id: t._id,
        templateName: t.templateName,
        displayName: t.displayName,
        category: t.category,
        language: t.language,
        status: t.status,
        variablesCount: t.variablesCount,
        variableLabels: t.variableLabels,
        variableExamples: t.variableExamples,
        previewText: t.previewText,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Send WhatsApp template message to user
// @route   POST /admin/whatsapp/send OR POST /api/admin/whatsapp/send
// @access  Private (Admin)
export const sendWhatsAppTemplateToUser = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.body.user_id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'A valid userId is required' });
    }

    const user = await User.findById(userId).select('_id name phoneNumber');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let mobile;
    try {
      mobile = normalizeWhatsAppNumber(user.phoneNumber);
    } catch (error) {
      if (error instanceof WhatsAppApiError) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      throw error;
    }

    const templateName = getOptionalString(
      req.body.template_name || req.body.templateName || process.env.APITXT_WA_TEMPLATE_NAME || 'kosmico_general_offer',
      'template_name',
    );
    if (!templateName) {
      return res.status(400).json({ success: false, message: 'template_name is required' });
    }

    let bodyParams = req.body.body_params ?? req.body.bodyParams;

    // Support comma-separated string from frontend input (e.g. "Abhay, Offer, 20, KOSMICO, 10 Nov, link.com")
    if (typeof bodyParams === 'string') {
      bodyParams = bodyParams.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }

    if (bodyParams !== undefined && (!Array.isArray(bodyParams) || bodyParams.length > 20)) {
      return res.status(400).json({
        success: false,
        message: 'body_params must be an array with no more than 20 values',
      });
    }
    if (bodyParams?.some((value) => !['string', 'number'].includes(typeof value))) {
      return res.status(400).json({
        success: false,
        message: 'Each body_params value must be a string or number',
      });
    }

    const urlButtons = req.body.url_buttons ?? req.body.urlButtons;
    if (urlButtons !== undefined && (
      !Array.isArray(urlButtons) &&
      (typeof urlButtons !== 'object' || urlButtons === null)
    )) {
      return res.status(400).json({
        success: false,
        message: 'url_buttons must be an array or object',
      });
    }

    const providerResult = await sendWhatsAppTemplate({
      mobile,
      templateName,
      language: getOptionalString(req.body.language, 'language'),
      bodyParams: bodyParams?.map(String),
      headerText: getOptionalString(req.body.header_text || req.body.headerText, 'header_text'),
      headerImageUrl: getOptionalString(req.body.header_image_url || req.body.headerImageUrl, 'header_image_url'),
      headerVideoUrl: getOptionalString(req.body.header_video_url || req.body.headerVideoUrl, 'header_video_url'),
      headerDocumentUrl: getOptionalString(req.body.header_document_url || req.body.headerDocumentUrl, 'header_document_url'),
      headerDocumentFilename: getOptionalString(
        req.body.header_document_filename || req.body.headerDocumentFilename,
        'header_document_filename',
      ),
      urlButtons,
    });

    return res.status(200).json({
      success: true,
      message: `WhatsApp template sent to ${user.name || 'user'}`,
      userId: user._id,
      mobile,
      templateName,
      result: providerResult,
    });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
};
