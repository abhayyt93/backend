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
      tls: {
        rejectUnauthorized: false
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
    const timeNow = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const mailOptions = {
      from: `"Kosmico Wellness" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Kosmico Wellness - OTP Verification [${timeNow}]`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #4A5568; text-align: center;">Email Verification</h2>
          <p>Thank you for starting your wellness journey with Kosmico Wellness.</p>
          <p>Please use the following One-Time Password (OTP) to complete your registration. This OTP is valid for 10 minutes:</p>
          <div style="background: #edf2f7; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 6px; color: #2d3748;">
            ${otp}
          </div>
          <p>If you did not request this, please ignore this email.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>Kosmico Wellness Team</strong></p>
          <hr style="border:none; border-top:1px solid #eee; margin-top:20px;" />
          <p style="color: #a0aec0; font-size: 11px; text-align: center;">Generated at: ${timeNow}</p>
        </div>
      `,
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
    const timeNow = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const mailOptions = {
      from: `"Kosmico Wellness" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Kosmico Wellness - Login OTP [${timeNow}]`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #2B6CB0; text-align: center;">🔐 Login Verification</h2>
          <p>Someone is trying to log in to your Kosmico Wellness account.</p>
          <p>Please use the following One-Time Password (OTP) to verify your login. This OTP is valid for <strong>10 minutes</strong>:</p>
          <div style="background: #EBF8FF; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 6px; color: #2B6CB0; border: 1px solid #BEE3F8;">
            ${otp}
          </div>
          <p style="color: #718096; font-size: 14px;">⚠️ If you did not attempt to log in, please ignore this email.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>Kosmico Wellness Team</strong></p>
          <hr style="border:none; border-top:1px solid #eee; margin-top:20px;" />
          <p style="color: #a0aec0; font-size: 11px; text-align: center;">Generated at: ${timeNow}</p>
        </div>
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✅ Login OTP sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending Login OTP to ${toEmail}:`, error);
    throw error;
  }
};

export { sendOTPEmail, sendLoginOTP };
