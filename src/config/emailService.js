import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: process.env.SMTP_PORT || 465,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true, // true for 465
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
      to: toEmail,
      subject: `Your Kosmico Wellness Verification Code`,
      text: `Welcome to Kosmico Wellness!\n\nPlease use the following code to complete your registration. This code is valid for 10 minutes:\n\n${otp}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nKosmico Wellness Team`,
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
  <div style="background-color: #ffffff; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #4A5568; text-align: center;">Welcome to Kosmico Wellness</h2>
    <p>Thank you for starting your wellness journey with us.</p>
    <p>Please use the following verification code to complete your registration. This code is valid for 10 minutes:</p>
    <div style="background: #edf2f7; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 6px; color: #2d3748;">
      ${otp}
    </div>
    <p>If you did not request this, please safely ignore this email.</p>
    <br />
    <p>Best regards,</p>
    <p><strong>Kosmico Wellness Team</strong></p>
  </div>
</body>
</html>`,
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
      to: toEmail,
      subject: `Your Kosmico Wellness Login Code`,
      text: `Hello,\n\nPlease use the following code to verify your login to your Kosmico Wellness account. This code is valid for 10 minutes:\n\n${otp}\n\nIf you did not attempt to log in, please secure your account.\n\nBest regards,\nKosmico Wellness Team`,
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
  <div style="background-color: #ffffff; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #2B6CB0; text-align: center;">Secure Login</h2>
    <p>Hello,</p>
    <p>Please use the following code to verify your login. This code is valid for <strong>10 minutes</strong>:</p>
    <div style="background: #EBF8FF; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 6px; color: #2B6CB0; border: 1px solid #BEE3F8;">
      ${otp}
    </div>
    <p style="color: #718096; font-size: 14px;">If you did not attempt to log in, please ignore this email and ensure your account is secure.</p>
    <br />
    <p>Best regards,</p>
    <p><strong>Kosmico Wellness Team</strong></p>
  </div>
</body>
</html>`,
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
      to: toEmail,
      subject: `Kosmico Wellness - Admin Password Reset`,
      text: `Hello,\n\nWe received a request to reset the password for your Admin account.\n\nPlease use the following code to reset your password. This code is valid for 10 minutes:\n\n${otp}\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nKosmico Wellness Team`,
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
  <div style="background-color: #ffffff; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #E53E3E; text-align: center;">Admin Password Reset</h2>
    <p>Hello,</p>
    <p>We received a request to reset the password for your Admin account.</p>
    <p>Please use the following code to reset your password. This code is valid for <strong>10 minutes</strong>:</p>
    <div style="background: #FFF5F5; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 6px; color: #E53E3E; border: 1px solid #FEB2B2;">
      ${otp}
    </div>
    <p style="color: #718096; font-size: 14px;">If you did not request a password reset, please safely ignore this email.</p>
    <br />
    <p>Best regards,</p>
    <p><strong>Kosmico Wellness Team</strong></p>
  </div>
</body>
</html>`,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✅ Admin Forgot Password OTP sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending Admin Forgot Password OTP to ${toEmail}:`, error);
    throw error;
  }
};

export { sendOTPEmail, sendLoginOTP, sendAdminForgotPasswordOTP };
