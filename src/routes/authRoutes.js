import express from 'express';
import {
  registerUser,
  signupVerify,
  loginUser,
  loginVerify,
  getUserProfile,
  updateUserProfile,
  updateProfilePicture,
  removeProfilePicture,
  resendOTP,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Signup Routes
router.post('/register', registerUser);
router.post('/signup-verify', signupVerify);

// Login Routes
router.post('/login', loginUser);
router.post('/login-verify', loginVerify);

// Resend OTP Route
router.post('/resend-otp', resendOTP);

// Protected Routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('profilePicture'), updateUserProfile);
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.delete('/remove-profile-picture', protect, removeProfilePicture);

export default router;

