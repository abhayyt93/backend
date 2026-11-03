import mongoose from 'mongoose';
import User from '../models/User.js';
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

    const bodyParams = req.body.body_params ?? req.body.bodyParams;
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
