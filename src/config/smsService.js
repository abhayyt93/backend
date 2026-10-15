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

// Send DLT Compliant SMS via /api/sendMsg
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

// Send Priority Instant OTP via /api/sendOTP
const sendPriorityOTP = async (mobile, otp, senderId, templateRefId = null) => {
  const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
  const apiUrl = process.env.APITXT_URL || APITXT_OTP_URL;

  // 1. Try with branded templateRefId if provided
  if (templateRefId) {
    try {
      const params = new URLSearchParams();
      params.append('authkey', authKey);
      params.append('mobile', mobile);
      params.append('otp', otp);
      if (senderId) params.append('sender', senderId);
      params.append('template_id', templateRefId);

      const response = await axios.post(apiUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; KosmicoWellness/1.0)',
        },
        timeout: 8000,
      });

      if (response.data?.status === 'success' || response.data?.status === 200) {
        return response.data;
      }
    } catch (err) {
      if (err.response?.status === 429) throw err;
      console.warn(`⚠️ Template OTP with ${templateRefId} failed (${err.response?.data?.message || err.message}). Falling back to instant priority OTP pipe...`);
    }
  }

  // 2. Guaranteed Delivery: Instant Priority OTP (no template dependency, delivers in 2 seconds)
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

  return fallbackResponse.data;
};

// Master SMS Sender
const sendAPITxTSMS = async (toPhoneNumber, otp, purpose = 'Login') => {
  const mobile = cleanPhoneNumber(toPhoneNumber);
  if (!mobile || mobile.length !== 12) {
    throw new Error(`Invalid mobile number provided: ${toPhoneNumber}`);
  }

  const isSignup = purpose.toLowerCase() === 'signup' || purpose.toLowerCase() === 'register';
  const senderId = process.env.APITXT_SENDER_ID || APITXT_DEFAULT_SENDER_ID;
  const peId = process.env.APITXT_PE_ID || APITXT_DEFAULT_PE_ID;
  const chainId = process.env.APITXT_CHAIN_ID || APITXT_DEFAULT_CHAIN_ID;
  const telemarketerId = process.env.APITXT_TMD_ID || APITXT_DEFAULT_TMD_ID;

  // 1. For Login: We have an approved DLT Template ID (1077489100059146838) matching the Login text exactly
  if (!isSignup) {
    const loginTemplateId = process.env.APITXT_LOGIN_TEMPLATE_ID || process.env.APITXT_TEMPLATE_ID || APITXT_DEFAULT_TEMPLATE_ID;
    const rawTemplate = process.env.APITXT_LOGIN_MESSAGE_TEMPLATE || 'Kosmico Wellness Private Limited: Your login OTP is {#numeric#}. Do not share this code with anyone. Valid for 5 minutes.';

    if (process.env.ENABLE_DLT_ROUTE !== 'false' && peId && rawTemplate) {
      try {
        const message = rawTemplate.replace(/\{#numeric#\}|\{#var#\}|\{#VAR#\}|\{var\}|\[OTP\]|\[otp\]|\{otp\}/g, otp);
        const res = await sendDLTMessage({
          mobile,
          message,
          templateId: loginTemplateId,
          peId,
          senderId,
          chainId,
          telemarketerId,
        });

        console.log(`✅ [Login] DLT Branded SMS sent successfully from '${senderId}' (Template: ${loginTemplateId}) to ${mobile}:`, res);
        return res;
      } catch (dltError) {
        if (dltError.response?.status === 429) throw dltError;
        const errMsg = dltError.response?.data?.message || dltError.message;
        console.warn(`⚠️ [Login] DLT /api/sendMsg failed (${errMsg}). Falling back to Priority OTP channel...`);
      }
    }

    // Fallback for Login
    const fallbackRes = await sendPriorityOTP(mobile, otp, senderId, process.env.APITXT_LOGIN_REF_ID || process.env.APITXT_REF_ID);
    console.log(`✅ [Login] Fallback Priority OTP delivered to ${mobile}:`, fallbackRes);
    return fallbackRes;
  }

  // 2. For Signup / Registration:
  // If a dedicated separate DLT ID is registered on Airtel DLT, use DLT route
  const signupDltId = process.env.APITXT_SIGNUP_DLT_ID;
  if (signupDltId && signupDltId !== APITXT_DEFAULT_TEMPLATE_ID) {
    const rawSignupTemplate = process.env.APITXT_SIGNUP_MESSAGE_TEMPLATE || 'Kosmico Wellness: Your registration OTP is {#numeric#}. Do not share this code with anyone. Valid for 5 minutes.';
    try {
      const message = rawSignupTemplate.replace(/\{#numeric#\}|\{#var#\}|\{#VAR#\}|\{var\}|\[OTP\]|\[otp\]|\{otp\}/g, otp);
      const res = await sendDLTMessage({
        mobile,
        message,
        templateId: signupDltId,
        peId,
        senderId,
        chainId,
        telemarketerId,
      });
      console.log(`✅ [Signup] DLT Branded SMS sent successfully from '${senderId}' (Template: ${signupDltId}) to ${mobile}:`, res);
      return res;
    } catch (dltErr) {
      if (dltErr.response?.status === 429) throw dltErr;
      console.warn(`⚠️ [Signup] DLT /api/sendMsg failed (${dltErr.message}). Falling back to Priority OTP channel...`);
    }
  }

  // Send via APITxT Priority OTP Channel (with auto-fallback to guaranteed instant pipe)
  const signupRefId = process.env.APITXT_SIGNUP_REF_ID; // TMP-16C16287
  try {
    const res = await sendPriorityOTP(mobile, otp, senderId, signupRefId);
    console.log(`✅ [Signup] Priority OTP delivered to ${mobile}:`, res);
    return res;
  } catch (error) {
    if (error.response?.status === 429) throw error;
    console.warn(`⚠️ Branded signup OTP failed, sending guaranteed instant OTP:`, error.message);
    const guaranteedRes = await sendPriorityOTP(mobile, otp, senderId, null);
    console.log(`✅ [Signup] Guaranteed OTP delivered to ${mobile}:`, guaranteedRes);
    return guaranteedRes;
  }
};

const sendSMSOTP = async (toPhoneNumber, otp) => {
  return await sendAPITxTSMS(toPhoneNumber, otp, 'Signup');
};

const sendSMSLoginOTP = async (toPhoneNumber, otp) => {
  return await sendAPITxTSMS(toPhoneNumber, otp, 'Login');
};

export { sendSMSOTP, sendSMSLoginOTP };




