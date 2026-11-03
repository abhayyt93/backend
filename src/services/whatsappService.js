import axios from 'axios';

const APITXT_WHATSAPP_URL = 'https://apitxt.com/api/sendWA';

export class WhatsAppApiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'WhatsAppApiError';
    this.statusCode = statusCode;
  }
}

export const normalizeWhatsAppNumber = (phoneNumber) => {
  let mobile = String(phoneNumber || '').replace(/\D/g, '');

  if (mobile.length === 10) {
    mobile = `91${mobile}`;
  } else if (mobile.length === 11 && mobile.startsWith('0')) {
    mobile = `91${mobile.slice(1)}`;
  }

  if (mobile.length < 11 || mobile.length > 15 || mobile.startsWith('0')) {
    throw new WhatsAppApiError('User does not have a valid WhatsApp phone number', 400);
  }

  return mobile;
};

export const sendWhatsAppTemplate = async ({
  mobile,
  templateName,
  language,
  bodyParams,
  headerText,
  headerImageUrl,
  headerVideoUrl,
  headerDocumentUrl,
  headerDocumentFilename,
  urlButtons,
}) => {
  const authKey = process.env.APITXT_WA_AUTH_KEY || process.env.APITXT_AUTH_KEY;
  if (!authKey) {
    throw new WhatsAppApiError('WhatsApp API key is not configured', 503);
  }

  const payload = {
    authkey: authKey,
    template_name: templateName,
    mobiles: mobile,
  };
  const projectRefId = process.env.APITXT_WA_PROJECT_REF_ID;

  if (projectRefId) payload.project_ref_id = projectRefId;
  if (language) payload.language = language;
  if (bodyParams) payload.body_params = bodyParams;
  if (headerText) payload.header_text = headerText;
  if (headerImageUrl) payload.header_image_url = headerImageUrl;
  if (headerVideoUrl) payload.header_video_url = headerVideoUrl;
  if (headerDocumentUrl) payload.header_document_url = headerDocumentUrl;
  if (headerDocumentFilename) payload.header_document_filename = headerDocumentFilename;
  if (urlButtons) payload.url_buttons = urlButtons;

  let response;
  try {
    response = await axios.post(APITXT_WHATSAPP_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
  } catch (error) {
    const statusCode = error.response ? 502 : 503;
    const providerMessage = error.response?.data?.message;
    throw new WhatsAppApiError(
      typeof providerMessage === 'string'
        ? `WhatsApp provider rejected the request: ${providerMessage}`
        : 'Could not reach the WhatsApp provider',
      statusCode,
    );
  }

  if (Number(response.data?.status) !== 200) {
    const providerMessage = response.data?.message;
    throw new WhatsAppApiError(
      typeof providerMessage === 'string'
        ? `WhatsApp provider rejected the request: ${providerMessage}`
        : 'WhatsApp provider returned an unsuccessful response',
    );
  }

  return response.data;
};
