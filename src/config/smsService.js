import axios from 'axios';

const APITXT_MSG_URL = 'https://apitxt.com/api/sendMsg';
const APITXT_OTP_URL = process.env.APITXT_URL || 'https://apitxt.com/api/sendOTP';
const APITXT_AUTH_KEY = process.env.APITXT_AUTH_KEY || 'jMERhkU5Sx89ZNumT2hmZZOVII_LQBGXcvsjB63AETo';
const APITXT_DEFAULT_TEMPLATE_ID = process.env.APITXT_TEMPLATE_ID || '1077489100059146838';
const APITXT_DEFAULT_SENDER_ID = process.env.APITXT_SENDER_ID || 'KOSWEL';
const APITXT_DEFAULT_PE_ID = process.env.APITXT_PE_ID || '1001544903717062605';
const APITXT_DEFAULT_CHAIN_ID = process.env.APITXT_CHAIN_ID || '1015199753179386253';
const APITXT_DEFAULT_TMD_ID = process.env.APITXT_TMD_ID || '1302157225275643280';
const APITXT_DEFAULT_REF_ID = process.env.APITXT_REF_ID || 'TMP-11EB11E9';

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

// Send DLT Compliant SMS via /api/sendMsg (Sender Header: KOSWEL, Template ID: 1077489100059146838)
const sendDLTMessage = async ({ mobile, message, templateId, peId, senderId, chainId, telemarketerId }) => {
  const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
  const params = new URLSearchParams();
  params.append('authkey', authKey);
  params.append('mobiles', mobile);
  params.append('message', message);
  params.append('sender', senderId || APITXT_DEFAULT_SENDER_ID);
  params.append('route', '4');
  params.append('template_id', templateId || APITXT_DEFAULT_TEMPLATE_ID);
  params.append('pe_id', peId || APITXT_DEFAULT_PE_ID);

  if (chainId || APITXT_DEFAULT_CHAIN_ID) {
    params.append('chain_id', chainId || APITXT_DEFAULT_CHAIN_ID);
  }
  if (telemarketerId || APITXT_DEFAULT_TMD_ID) {
    params.append('telemarketer_id', telemarketerId || APITXT_DEFAULT_TMD_ID);
  }

  const response = await axios.post(APITXT_MSG_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
    },
    timeout: 10000,
  });

  if (response.data && response.data.status !== 'success' && response.data.status !== 200) {
    throw new Error(response.data.message || 'DLT SMS API returned an unsuccessful status');
  }

  return response.data;
};

// Send Fallback Priority OTP via /api/sendOTP
const sendFallbackOTP = async (mobile, otp, senderId, templateRefId) => {
  const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
  const apiUrl = process.env.APITXT_URL || APITXT_OTP_URL;
  const refId = templateRefId || process.env.APITXT_REF_ID || APITXT_DEFAULT_REF_ID;

  const params = new URLSearchParams();
  params.append('authkey', authKey);
  params.append('mobile', mobile);
  params.append('otp', otp);
  if (senderId) params.append('sender', senderId);
  if (refId) params.append('template_id', refId);

  const response = await axios.post(apiUrl, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
    },
    timeout: 8000,
  });

  return response.data;
};

// Unified SMS Sender - Routes via Active DLT Chain First, with Instant Fallback
const sendAPITxTSMS = async (toPhoneNumber, otp, templateId, purpose = 'Login') => {
  const mobile = cleanPhoneNumber(toPhoneNumber);
  if (!mobile || mobile.length !== 12) {
    throw new Error(`Invalid mobile number provided: ${toPhoneNumber}`);
  }

  const peId = process.env.APITXT_PE_ID || APITXT_DEFAULT_PE_ID;
  const senderId = process.env.APITXT_SENDER_ID || APITXT_DEFAULT_SENDER_ID;
  const chainId = process.env.APITXT_CHAIN_ID || APITXT_DEFAULT_CHAIN_ID;
  const telemarketerId = process.env.APITXT_TMD_ID || APITXT_DEFAULT_TMD_ID;
  const effectiveTemplateId = templateId || process.env.APITXT_TEMPLATE_ID || APITXT_DEFAULT_TEMPLATE_ID;

  let rawMessageTemplate = null;
  if (purpose.toLowerCase() === 'signup' || purpose.toLowerCase() === 'register') {
    rawMessageTemplate = process.env.APITXT_SIGNUP_MESSAGE_TEMPLATE || process.env.APITXT_MESSAGE_TEMPLATE || process.env.APITXT_LOGIN_MESSAGE_TEMPLATE;
  } else {
    rawMessageTemplate = process.env.APITXT_LOGIN_MESSAGE_TEMPLATE || process.env.APITXT_MESSAGE_TEMPLATE;
  }

  if (!rawMessageTemplate) {
    rawMessageTemplate = 'Kosmico Wellness Private Limited: Your login OTP is {#numeric#}. Do not share this code with anyone. Valid for 5 minutes.';
  }

  const enableDLTRoute = process.env.ENABLE_DLT_ROUTE !== 'false';

  // 1. Try DLT Branded Route (Airtel DLT Chain is ACTIVE, Header: KOSWEL, Template Content + ID)
  if (enableDLTRoute && peId && rawMessageTemplate) {
    try {
      const message = rawMessageTemplate.replace(/\{#numeric#\}|\{#var#\}|\{#VAR#\}|\{var\}|\[OTP\]|\[otp\]|\{otp\}/g, otp);
      const res = await sendDLTMessage({
        mobile,
        message,
        templateId: effectiveTemplateId,
        peId,
        senderId,
        chainId,
        telemarketerId,
      });

      console.log(`✅ [${purpose}] DLT Branded SMS sent successfully from '${senderId}' (Template: ${effectiveTemplateId}) to ${mobile}:`, res);
      return res;
    } catch (dltError) {
      const errMsg = dltError.response?.data?.message || (dltError.response ? JSON.stringify(dltError.response.data) : dltError.message);
      console.warn(`⚠️ [${purpose}] DLT /api/sendMsg failed (${errMsg}). Falling back to Priority OTP channel...`);
    }
  }

  // 2. Guaranteed Fallback via Priority OTP Route
  try {
    const fallbackRes = await sendFallbackOTP(mobile, otp, senderId, effectiveTemplateId);
    console.log(`✅ [${purpose}] Fallback Priority OTP delivered to ${mobile}:`, fallbackRes);
    return fallbackRes;
  } catch (error) {
    const errorDetails = error.response?.data?.message || (error.response ? JSON.stringify(error.response.data) : error.message);
    console.error(`❌ Error sending ${purpose} SMS OTP to ${mobile}:`, errorDetails);
    throw new Error(errorDetails);
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




