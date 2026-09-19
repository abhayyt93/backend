import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      family: 4, // Force IPv4 to prevent ENETUNREACH on Render
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Add timeouts to prevent hanging indefinitely
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return transporter;
};

const sendOTPEmail = async (toEmail, otp) => {
  try {
    const mailOptions = {
      from: `"Kosmico Wellness" <${process.env.EMAIL_USER}>`,
      replyTo: `"Kosmico Support" <support@kosmicowellness.com>`,
      to: toEmail,
      subject: `Your Kosmico Wellness Verification Code`,
      text: `Welcome to Kosmico Wellness!\n\nPlease use the following code to complete your registration. This code is valid for 10 minutes:\n\n${otp}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nKosmico Wellness Team`,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✅ Signup OTP sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending Signup OTP to ${toEmail}:`, error);
    throw error;
  }
};

const sendLoginOTP = async (toEmail, otp) => {
  try {
    const mailOptions = {
      from: `"Kosmico Wellness" <${process.env.EMAIL_USER}>`,
      replyTo: `"Kosmico Support" <support@kosmicowellness.com>`,
      to: toEmail,
      subject: `Your Kosmico Wellness Login Code`,
      text: `Hello,\n\nPlease use the following code to verify your login to your Kosmico Wellness account. This code is valid for 10 minutes:\n\n${otp}\n\nIf you did not attempt to log in, please secure your account.\n\nBest regards,\nKosmico Wellness Team`,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✅ Login OTP sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending Login OTP to ${toEmail}:`, error);
    throw error;
  }
};

const sendAdminForgotPasswordOTP = async (toEmail, otp) => {
  try {
    const mailOptions = {
      from: `"Kosmico Wellness" <${process.env.EMAIL_USER}>`,
      replyTo: `"Kosmico Support" <support@kosmicowellness.com>`,
      to: toEmail,
      subject: `Kosmico Wellness - Admin Password Reset`,
      text: `Hello,\n\nWe received a request to reset the password for your Admin account.\n\nPlease use the following code to reset your password. This code is valid for 10 minutes:\n\n${otp}\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nKosmico Wellness Team`,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✅ Admin Forgot Password OTP sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending Admin Forgot Password OTP to ${toEmail}:`, error);
    throw error;
  }
};

export { sendOTPEmail, sendLoginOTP, sendAdminForgotPasswordOTP };
