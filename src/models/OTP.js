import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['register', 'login', 'admin_register'],
    default: 'register',
  },
  name: {
    type: String,
  },
  password: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Auto-delete after 10 minutes (600 seconds)
  },
});

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
