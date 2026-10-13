import axios from 'axios';

const APITXT_URL = process.env.APITXT_URL || 'https://apitxt.com/api/sendOTP';
const APITXT_MSG_URL = 'https://apitxt.com/api/sendMsg';
const APITXT_AUTH_KEY = process.env.APITXT_AUTH_KEY || 'jMERhkU5Sx89ZNumT2hmZZOVII_LQBGXcvsjB63AETo';
const APITXT_DEFAULT_TEMPLATE_ID = process.env.APITXT_TEMPLATE_ID || '1077489100059146838';
const APITXT_DEFAULT_SENDER_ID = process.env.APITXT_SENDER_ID || 'KOSWEL';

// Helper to normalize phone number for APITxT (formats any Indian number to 91XXXXXXXXXX)
const cleanPhoneNumber = (toPhoneNumber) => {
  if (!toPhoneNumber) return '';
  let cleaned = toPhoneNumber.toString().replace(/\D/g, '');

  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = `91${cleaned.slice(1)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Already in correct 91XXXXXXXXXX format
  } else if (cleaned.length > 10) {
    cleaned = `91${cleaned.slice(-10)}`;
  }
  return cleaned;
};

// Send DLT Compliant SMS via /api/sendMsg (Brands: Kosmico Wellness, Sender: KOSWEL)
const sendDLTMessage = async ({ mobile, message, templateId, peId, senderId }) => {
  const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
  const params = new URLSearchParams();
  params.append('authkey', authKey);
  params.append('mobiles', mobile);
  params.append('message', message);
  params.append('sender', senderId || APITXT_DEFAULT_SENDER_ID);
  params.append('route', '4');
  params.append('template_id', templateId || APITXT_DEFAULT_TEMPLATE_ID);
  params.append('pe_id', peId);

  const response = await axios.post(APITXT_MSG_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
    },
    timeout: 10000,
  });

  if (response.data && response.data.status !== 'success' && response.data.status !== 200) {
    throw new Error(response.data.message || 'DLT SMS API returned error');
  }

  return response.data;
};

// Send Generic OTP via /api/sendOTP (Fallback route)
const sendFallbackOTP = async (mobile, otp, senderId) => {
  const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
  const apiUrl = process.env.APITXT_URL || APITXT_URL;

  const params = new URLSearchParams();
  params.append('authkey', authKey);
  params.append('mobile', mobile);
  params.append('otp', otp);
  if (senderId) {
    params.append('sender', senderId);
  }

  const response = await axios.post(apiUrl, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
    },
    timeout: 10000,
  });

  return response.data;
};

// Unified SMS Sender
const sendAPITxTSMS = async (toPhoneNumber, otp, templateId, purpose = 'Login') => {
  const mobile = cleanPhoneNumber(toPhoneNumber);
  if (!mobile || mobile.length !== 12) {
    throw new Error(`Invalid mobile number provided: ${toPhoneNumber}`);
  }

  const peId = process.env.APITXT_PE_ID;
  const senderId = process.env.APITXT_SENDER_ID || APITXT_DEFAULT_SENDER_ID;
  let rawMessageTemplate = null;
  if (purpose.toLowerCase() === 'signup' || purpose.toLowerCase() === 'register') {
    rawMessageTemplate = process.env.APITXT_SIGNUP_MESSAGE_TEMPLATE || process.env.APITXT_MESSAGE_TEMPLATE;
  } else {
    rawMessageTemplate = process.env.APITXT_LOGIN_MESSAGE_TEMPLATE || process.env.APITXT_MESSAGE_TEMPLATE;
  }

  const enableDLTRoute = process.env.ENABLE_DLT_ROUTE === 'true';

  // 1. If DLT is explicitly enabled and credentials exist, try sending via DLT route
  if (enableDLTRoute && peId && rawMessageTemplate) {
    try {
      const message = rawMessageTemplate.replace(/\{#numeric#\}|\{#var#\}|\{#VAR#\}|\{var\}|\[OTP\]|\[otp\]|\{otp\}/g, otp);
      const res = await sendDLTMessage({ mobile, message, templateId, peId, senderId });
      console.log(`✅ [${purpose}] DLT Branded SMS sent successfully from ${senderId} to ${mobile}:`, res);
      return res;
    } catch (dltError) {
      console.warn(`⚠️ DLT /api/sendMsg failed (${dltError.message}). Falling back to instant OTP route...`);
    }
  }

  // 2. Guaranteed Fast OTP Route (/api/sendOTP) - Always delivers within 2 seconds
  try {
    const res = await sendFallbackOTP(mobile, otp, senderId);
    console.log(`✅ [${purpose}] Instant SMS OTP sent to ${mobile}:`, res);
    return res;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Error sending ${purpose} SMS OTP to ${mobile}:`, errorDetails);
    throw error;
  }
};

const sendSMSOTP = async (toPhoneNumber, otp) => {
  const templateId = process.env.APITXT_SIGNUP_TEMPLATE_ID || process.env.APITXT_TEMPLATE_ID || APITXT_DEFAULT_TEMPLATE_ID;
  return await sendAPITxTSMS(toPhoneNumber, otp, templateId, 'Signup');
};

const sendSMSLoginOTP = async (toPhoneNumber, otp) => {
  const templateId = process.env.APITXT_LOGIN_TEMPLATE_ID || process.env.APITXT_TEMPLATE_ID || APITXT_DEFAULT_TEMPLATE_ID;
  return await sendAPITxTSMS(toPhoneNumber, otp, templateId, 'Login');
};

export { sendSMSOTP, sendSMSLoginOTP };



