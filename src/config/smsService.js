import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;

const getTwilioClient = () => {
  if (!client) {
    if (accountSid && authToken) {
        client = twilio(accountSid, authToken);
    } else {
        console.warn("⚠️ Twilio credentials missing in .env");
    }
  }
  return client;
};

const sendSMSOTP = async (toPhoneNumber, otp) => {
  try {
    const twilioClient = getTwilioClient();
    if (!twilioClient) {
        console.log(`[TESTING MODE] SMS to ${toPhoneNumber}: Your Kosmico Wellness Verification Code is ${otp}`);
        return;
    }
    
    // Ensure phone number has country code (defaulting to India if none provided)
    const formattedNumber = toPhoneNumber.startsWith('+') ? toPhoneNumber : `+91${toPhoneNumber}`;

    const message = await twilioClient.messages.create({
      body: `Welcome to Kosmico Wellness! Your verification code is: ${otp}. It is valid for 10 minutes.`,
      from: twilioPhoneNumber,
      to: formattedNumber,
    });

    console.log(`✅ Signup SMS OTP sent successfully to ${formattedNumber}. Message SID: ${message.sid}`);
  } catch (error) {
    console.error(`❌ Error sending Signup SMS OTP to ${toPhoneNumber}:`, error);
    throw error;
  }
};

const sendSMSLoginOTP = async (toPhoneNumber, otp) => {
  try {
    const twilioClient = getTwilioClient();
    if (!twilioClient) {
        console.log(`[TESTING MODE] SMS to ${toPhoneNumber}: Your Kosmico Wellness Login Code is ${otp}`);
        return;
    }

    // Ensure phone number has country code
    const formattedNumber = toPhoneNumber.startsWith('+') ? toPhoneNumber : `+91${toPhoneNumber}`;

    const message = await twilioClient.messages.create({
      body: `Kosmico Wellness Secure Login: Your code is ${otp}. It is valid for 10 minutes. Do not share this with anyone.`,
      from: twilioPhoneNumber,
      to: formattedNumber,
    });

    console.log(`✅ Login SMS OTP sent successfully to ${formattedNumber}. Message SID: ${message.sid}`);
  } catch (error) {
    console.error(`❌ Error sending Login SMS OTP to ${toPhoneNumber}:`, error);
    throw error;
  }
};

export { sendSMSOTP, sendSMSLoginOTP };
