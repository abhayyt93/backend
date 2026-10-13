import axios from 'axios';

const APITXT_URL = process.env.APITXT_URL || 'https://apitxt.com/api/sendOTP';
const APITXT_AUTH_KEY = process.env.APITXT_AUTH_KEY || 'jMERhkU5Sx89ZNumT2hmZZOVII_LQBGXcvsjB63AETo';
const APITXT_DEFAULT_REF_ID = process.env.APITXT_REF_ID || 'TMP-11EB11E9';
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

// Send OTP via APITxT Priority OTP Channel
const sendAPITxTSMS = async (toPhoneNumber, otp, templateRefId, purpose = 'Login') => {
  const mobile = cleanPhoneNumber(toPhoneNumber);
  if (!mobile || mobile.length !== 12) {
    throw new Error(`Invalid mobile number provided: ${toPhoneNumber}`);
  }

  const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
  const apiUrl = process.env.APITXT_URL || APITXT_URL;
  const senderId = process.env.APITXT_SENDER_ID || APITXT_DEFAULT_SENDER_ID;
  const refId = templateRefId || process.env.APITXT_REF_ID || APITXT_DEFAULT_REF_ID;

  // 1. Try sending via Branded DLT Template (TMP-11EB11E9 / KOSWEL) through Priority OTP Pipe
  if (refId) {
    try {
      const brandedParams = new URLSearchParams();
      brandedParams.append('authkey', authKey);
      brandedParams.append('mobile', mobile);
      brandedParams.append('otp', otp);
      if (senderId) brandedParams.append('sender', senderId);
      brandedParams.append('template_id', refId);

      const response = await axios.post(apiUrl, brandedParams.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
        },
        timeout: 8000,
      });

      console.log(`✅ [${purpose}] Branded DLT OTP sent from ${senderId} (Template: ${refId}) to ${mobile}:`, response.data);
      return response.data;
    } catch (tmplError) {
      const errMsg = tmplError.response?.data?.message || tmplError.message;
      console.warn(`⚠️ Branded DLT template OTP failed (${errMsg}). Falling back to instant priority OTP pipe...`);
    }
  }

  // 2. Guaranteed Fast Priority OTP (Always delivers to phone within 2 seconds)
  try {
    const fallbackParams = new URLSearchParams();
    fallbackParams.append('authkey', authKey);
    fallbackParams.append('mobile', mobile);
    fallbackParams.append('otp', otp);
    if (senderId) fallbackParams.append('sender', senderId);

    const fallbackResponse = await axios.post(apiUrl, fallbackParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
      },
      timeout: 8000,
    });

    console.log(`✅ [${purpose}] Instant Priority OTP delivered to ${mobile}:`, fallbackResponse.data);
    return fallbackResponse.data;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Error sending ${purpose} SMS OTP to ${mobile}:`, errorDetails);
    throw error;
  }
};

const sendSMSOTP = async (toPhoneNumber, otp) => {
  const refId = process.env.APITXT_SIGNUP_REF_ID || process.env.APITXT_REF_ID || APITXT_DEFAULT_REF_ID;
  return await sendAPITxTSMS(toPhoneNumber, otp, refId, 'Signup');
};

const sendSMSLoginOTP = async (toPhoneNumber, otp) => {
  const refId = process.env.APITXT_LOGIN_REF_ID || process.env.APITXT_REF_ID || APITXT_DEFAULT_REF_ID;
  return await sendAPITxTSMS(toPhoneNumber, otp, refId, 'Login');
};

export { sendSMSOTP, sendSMSLoginOTP };




