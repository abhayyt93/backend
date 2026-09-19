import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import Notification from '../models/Notification.js';
import AppConfig from '../models/AppConfig.js';
import { sendOTPEmail, sendLoginOTP } from '../config/emailService.js';
import { sendSMSOTP, sendSMSLoginOTP } from '../config/smsService.js';

const isEmail = (identifier) => {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(identifier);
};

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
    // We accept 'identifier' (which could be email or phone) or fallback to 'email' field if frontend still sends it
    const identifier = req.body.identifier || req.body.email || req.body.phoneNumber;
    const name = req.body.name || 'User'; // Make name optional for phone signup, or keep it

    console.log(`📥 Received register request for: ${identifier}`);

    if (!identifier) {
      res.status(400);
      throw new Error('Please enter email or phone number');
    }

    const isEmailIdentifier = isEmail(identifier);
    const query = isEmailIdentifier ? { email: identifier } : { phoneNumber: identifier };

    // Check if user already exists
    const userExists = await User.findOne(query);
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this ' + (isEmailIdentifier ? 'email' : 'phone number'));
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save/update pending registration with OTP in database
    const otpQuery = isEmailIdentifier ? { email: identifier, purpose: 'register' } : { phoneNumber: identifier, purpose: 'register' };
    const otpUpdate = isEmailIdentifier 
        ? { otp, name, purpose: 'register', email: identifier, createdAt: Date.now() }
        : { otp, name, purpose: 'register', phoneNumber: identifier, createdAt: Date.now() };

    await OTP.findOneAndUpdate(
      otpQuery,
      otpUpdate,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send OTP
    if (isEmailIdentifier) {
        await sendOTPEmail(identifier, otp);
        res.status(200).json({ message: 'OTP sent to email. Please verify.' });
    } else {
        await sendSMSOTP(identifier, otp);
        res.status(200).json({ message: 'OTP sent via SMS. Please verify.' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP & Create Account (Step 2) - Signup Verify
// @route   POST /api/auth/signup-verify
// @access  Public
const signupVerify = async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.phoneNumber;
    const otp = req.body.otp;

    if (!identifier || !otp) {
      res.status(400);
      throw new Error('Please enter email/phone and OTP');
    }

    const isEmailIdentifier = isEmail(identifier);
    const otpQuery = isEmailIdentifier ? { email: identifier, purpose: 'register' } : { phoneNumber: identifier, purpose: 'register' };

    // Find the pending registration
    const otpRecord = await OTP.findOne(otpQuery);

    if (!otpRecord) {
      res.status(400);
      throw new Error('OTP expired or not found. Please register again.');
    }

    if (otpRecord.otp !== otp) {
      res.status(400);
      throw new Error('Invalid OTP');
    }

    const userQuery = isEmailIdentifier ? { email: identifier } : { phoneNumber: identifier };

    // Check if user already exists (edge case: double submit)
    const userExists = await User.findOne(userQuery);
    if (userExists) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400);
      throw new Error('User already exists');
    }

    // Create user
    const newUserObj = { name: otpRecord.name || 'User' };
    if (isEmailIdentifier) newUserObj.email = identifier;
    else newUserObj.phoneNumber = identifier;

    const user = await User.create(newUserObj);

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
    const identifier = req.body.identifier || req.body.email || req.body.phoneNumber;

    if (!identifier) {
      res.status(400);
      throw new Error('Please enter your email or phone number');
    }

    const isEmailIdentifier = isEmail(identifier);
    const query = isEmailIdentifier ? { email: identifier } : { phoneNumber: identifier };

    // Check if user exists
    const user = await User.findOne(query);
    if (!user) {
      res.status(404);
      throw new Error('No account found with this email/phone. Please signup first.');
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP with purpose 'login'
    const otpQuery = isEmailIdentifier ? { email: identifier, purpose: 'login' } : { phoneNumber: identifier, purpose: 'login' };
    const otpUpdate = isEmailIdentifier 
        ? { otp, purpose: 'login', email: identifier, createdAt: Date.now() }
        : { otp, purpose: 'login', phoneNumber: identifier, createdAt: Date.now() };

    await OTP.findOneAndUpdate(
      otpQuery,
      otpUpdate,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send login OTP
    if (isEmailIdentifier) {
        await sendLoginOTP(identifier, otp);
        res.status(200).json({ message: 'Login OTP sent to your email.' });
    } else {
        await sendSMSLoginOTP(identifier, otp);
        res.status(200).json({ message: 'Login OTP sent via SMS.' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Login OTP & return JWT token (Step 2) - Login Verify
// @route   POST /api/auth/login-verify
// @access  Public
const loginVerify = async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.phoneNumber;
    const otp = req.body.otp;

    if (!identifier || !otp) {
      res.status(400);
      throw new Error('Please enter email/phone and OTP');
    }

    const isEmailIdentifier = isEmail(identifier);
    const otpQuery = isEmailIdentifier ? { email: identifier, purpose: 'login' } : { phoneNumber: identifier, purpose: 'login' };

    // Find the login OTP record
    const otpRecord = await OTP.findOne(otpQuery);

    if (!otpRecord) {
      res.status(400);
      throw new Error('OTP expired or not found. Please request again.');
    }

    if (otpRecord.otp !== otp) {
      res.status(400);
      throw new Error('Invalid OTP');
    }

    // Find the user
    const userQuery = isEmailIdentifier ? { email: identifier } : { phoneNumber: identifier };
    const user = await User.findOne(userQuery);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Extract app version info from headers
    const platformHeader = req.headers['x-platform'] || req.headers['platform'] || req.query.platform;
    const versionHeader = req.headers['x-app-version'] || req.headers['app-version'] || req.query.version;

    // Update user's app version only if explicitly provided in headers
    if (platformHeader || versionHeader) {
      if (platformHeader) user.platform = platformHeader.toLowerCase();
      if (versionHeader) user.appVersion = versionHeader;
      await user.save();
    }

    // Set fallbacks for app config lookup
    const platform = (platformHeader || 'android').toLowerCase();
    const appVersion = versionHeader || '1.0.0';

    // Fetch AppConfig
    let appVersionInfo = null;
    if (platform === 'android' || platform === 'ios') {
      appVersionInfo = await AppConfig.findOne({ platform, is_active: true }).select('-__v -createdAt -updatedAt -_id');
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
      app_version_info: appVersionInfo
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
      // Extract app version info from headers
      const platformHeader = req.headers['x-platform'] || req.headers['platform'] || req.query.platform;
      const versionHeader = req.headers['x-app-version'] || req.headers['app-version'] || req.query.version;

      // Update user's app version only if explicitly provided
      let isUpdated = false;
      if (platformHeader && user.platform !== platformHeader.toLowerCase()) {
        user.platform = platformHeader.toLowerCase();
        isUpdated = true;
      }
      if (versionHeader && user.appVersion !== versionHeader) {
        user.appVersion = versionHeader;
        isUpdated = true;
      }
      if (isUpdated) {
        await user.save();
      }

      // Set fallbacks for app config lookup
      const platform = (platformHeader || 'android').toLowerCase();
      const appVersion = versionHeader || '1.0.0';

      // Fetch AppConfig
      let appVersionInfo = null;
      if (platform === 'android' || platform === 'ios') {
        appVersionInfo = await AppConfig.findOne({ platform, is_active: true }).select('-__v -createdAt -updatedAt -_id');
      }

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');

      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        app_version_info: appVersionInfo
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
      } else if (req.body.profilePicture !== undefined && req.body.profilePicture.trim() !== '') {
        // Only update if it's a valid string, prevent erasing with empty string
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

