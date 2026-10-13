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
  const useTemplate = process.env.APITXT_USE_TEMPLATE === 'true';

  const params = new URLSearchParams();
  params.append('authkey', authKey);
  params.append('mobile', mobile);
  params.append('otp', otp);
  if (senderId) params.append('sender', senderId);

  // If branded DLT template is explicitly enabled and verified, attach template_id
  if (useTemplate && refId) {
    params.append('template_id', refId);
  }

  try {
    const response = await axios.post(apiUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
      },
      timeout: 8000,
    });

    console.log(`✅ [${purpose}] Priority OTP sent to ${mobile} (Sender: ${senderId}${useTemplate ? `, Template: ${refId}` : ''}):`, response.data);
    return response.data;
  } catch (error) {
    const errorDetails = error.response?.data?.message || (error.response ? JSON.stringify(error.response.data) : error.message);
    console.error(`❌ Error sending ${purpose} SMS OTP to ${mobile}:`, errorDetails);
    throw new Error(errorDetails);
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




