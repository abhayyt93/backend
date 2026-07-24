import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import Notification from '../models/Notification.js';
import { sendOTPEmail, sendLoginOTP } from '../config/emailService.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register user (Step 1) - Send OTP to email
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    console.log(`📥 Received register request for: ${email}`);

    if (!name || !email) {
      res.status(400);
      throw new Error('Please enter name and email');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save/update pending registration with OTP in database
    await OTP.findOneAndUpdate(
      { email, purpose: 'register' },
      {
        otp,
        name,
        purpose: 'register',
        createdAt: Date.now(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to email. Please verify.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP & Create Account (Step 2) - Signup Verify
// @route   POST /api/auth/signup-verify
// @access  Public
const signupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Please enter email and OTP');
    }

    // Find the pending registration
    const otpRecord = await OTP.findOne({ email, purpose: 'register' });

    if (!otpRecord) {
      res.status(400);
      throw new Error('OTP expired or not found. Please register again.');
    }

    if (otpRecord.otp !== otp) {
      res.status(400);
      throw new Error('Invalid OTP');
    }

    // Check if user already exists (edge case: double submit)
    const userExists = await User.findOne({ email });
    if (userExists) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400);
      throw new Error('User already exists');
    }

    // Create user (no password needed!)
    const user = await User.create({
      name: otpRecord.name,
      email,
    });

    // Delete OTP record after successful registration
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      message: 'Account created successfully! Please login.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user (Step 1) - Send OTP to email
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Please enter your email');
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('No account found with this email. Please signup first.');
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP with purpose 'login'
    await OTP.findOneAndUpdate(
      { email, purpose: 'login' },
      {
        otp,
        purpose: 'login',
        createdAt: Date.now(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send login OTP email
    await sendLoginOTP(email, otp);

    res.status(200).json({ message: 'Login OTP sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Login OTP & return JWT token (Step 2) - Login Verify
// @route   POST /api/auth/login-verify
// @access  Public
const loginVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Please enter email and OTP');
    }

    // Find the login OTP record
    const otpRecord = await OTP.findOne({ email, purpose: 'login' });

    if (!otpRecord) {
      res.status(400);
      throw new Error('OTP expired or not found. Please request again.');
    }

    if (otpRecord.otp !== otp) {
      res.status(400);
      throw new Error('Invalid OTP');
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Delete OTP record after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    // Return user data with JWT token → Frontend takes user to Home Screen
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
      message: 'Login successful!',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile data
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    // req.user was set by protect middleware
    const user = await User.findById(req.user.id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP for both login and register
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    let { purpose } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Please provide email');
    }

    // Default to login if purpose is not provided
    if (!purpose) {
      purpose = 'login';
    }

    // If login, check if user exists
    if (purpose === 'login') {
      const user = await User.findOne({ email });
      if (!user) {
        res.status(404);
        throw new Error('No account found with this email. Please signup first.');
      }
    }

    // Generate new 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save new OTP
    await OTP.findOneAndUpdate(
      { email, purpose },
      {
        otp,
        purpose,
        createdAt: Date.now(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send correct email based on purpose
    if (purpose === 'login') {
      await sendLoginOTP(email, otp);
    } else {
      // register
      await sendOTPEmail(email, otp);
    }

    res.status(200).json({ message: 'OTP resent successfully to your email.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile data
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      if (req.body.name !== undefined) {
        user.name = req.body.name;
      }
      // email is not updated to keep it non-editable
      if (req.body.phoneNumber !== undefined) {
        user.phoneNumber = req.body.phoneNumber;
      }
      
      // Allow updating profile picture in the same API
      if (req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        user.profilePicture = `${baseUrl}/uploads/${req.file.filename}`;
      } else if (req.body.profilePicture !== undefined) {
        user.profilePicture = req.body.profilePicture;
      }

      const updatedUser = await user.save();

      // Create notification
      await Notification.create({
        user: updatedUser._id,
        title: 'Profile Updated',
        message: 'Your profile details were updated successfully.',
      });

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profilePicture: updatedUser.profilePicture,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile picture
// @route   PUT /api/auth/profile-picture
// @access  Private
const updateProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      if (req.file) {
        // Construct the full URL path to access the image
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        user.profilePicture = `${baseUrl}/uploads/${req.file.filename}`;
      } else if (req.body.profilePicture !== undefined) {
        // Fallback if they pass a URL string instead
        user.profilePicture = req.body.profilePicture;
      }

      const updatedUser = await user.save();

      // Create notification
      await Notification.create({
        user: updatedUser._id,
        title: 'Profile Picture Updated',
        message: 'Your profile picture was updated successfully.',
      });

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profilePicture: updatedUser.profilePicture,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Remove user profile picture
// @route   DELETE /api/auth/remove-profile-picture
// @access  Private
const removeProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.profilePicture = '';
      const updatedUser = await user.save();

      // Create notification
      await Notification.create({
        user: updatedUser._id,
        title: 'Profile Picture Removed',
        message: 'Your profile picture was removed successfully.',
      });

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profilePicture: updatedUser.profilePicture,
        message: 'Profile picture removed successfully'
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

export { registerUser, signupVerify, loginUser, loginVerify, getUserProfile, updateUserProfile, updateProfilePicture, removeProfilePicture, resendOTP };

