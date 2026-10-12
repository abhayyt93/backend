import axios from 'axios';

const APITXT_URL = process.env.APITXT_URL || 'https://apitxt.com/api/sendOTP';
const APITXT_AUTH_KEY = process.env.APITXT_AUTH_KEY || 'jMERhkU5Sx89ZNumT2hmZZOVII_LQBGXcvsjB63AETo';

// Helper to normalize phone number for APITxT (e.g. 10 digits -> 91XXXXXXXXXX)
const cleanPhoneNumber = (toPhoneNumber) => {
  if (!toPhoneNumber) return '';
  let cleaned = toPhoneNumber.toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

const sendSMSOTP = async (toPhoneNumber, otp) => {
  try {
    const mobile = cleanPhoneNumber(toPhoneNumber);
    if (!mobile) {
      throw new Error('Invalid mobile number provided');
    }

    const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
    const apiUrl = process.env.APITXT_URL || APITXT_URL;

    const params = new URLSearchParams();
    params.append('authkey', authKey);
    params.append('mobile', mobile);
    params.append('otp', otp);

    const response = await axios.post(apiUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log(`✅ Signup SMS OTP sent successfully to ${mobile}. Response:`, response.data);
    return response.data;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Error sending Signup SMS OTP to ${toPhoneNumber}:`, errorDetails);
    throw error;
  }
};

const sendSMSLoginOTP = async (toPhoneNumber, otp) => {
  try {
    const mobile = cleanPhoneNumber(toPhoneNumber);
    if (!mobile) {
      throw new Error('Invalid mobile number provided');
    }

    const authKey = process.env.APITXT_AUTH_KEY || APITXT_AUTH_KEY;
    const apiUrl = process.env.APITXT_URL || APITXT_URL;

    const params = new URLSearchParams();
    params.append('authkey', authKey);
    params.append('mobile', mobile);
    params.append('otp', otp);

    const response = await axios.post(apiUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log(`✅ Login SMS OTP sent successfully to ${mobile}. Response:`, response.data);
    return response.data;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Error sending Login SMS OTP to ${toPhoneNumber}:`, errorDetails);
    throw error;
  }
};

export { sendSMSOTP, sendSMSLoginOTP };

