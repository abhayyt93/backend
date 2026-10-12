import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import Notification from '../models/Notification.js';
import AppConfig from '../models/AppConfig.js';
import fs from 'fs';
import path from 'path';
import { sendOTPEmail, sendLoginOTP } from '../config/emailService.js';
import { sendSMSOTP, sendSMSLoginOTP } from '../config/smsService.js';
import { compareVersions } from '../utils/versionCheck.js';

// Helper function to save a Base64 image string to disk
const saveBase64Image = (base64String, req) => {
  try {
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64String;
    }
    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const filename = `profile-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
    const uploadPath = path.join(process.cwd(), 'uploads', filename);
    fs.writeFileSync(uploadPath, buffer);
    const reqHost = req.get('host');
        const reqProtocol = reqHost.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${reqProtocol}://${reqHost}`;
    return `${baseUrl}/uploads/${filename}`;
  } catch (err) {
    console.error("Error saving base64 profile image:", err.message);
    return base64String;
  }
};

const isEmail = (identifier) => {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(identifier);
};

// Helper function to match phone variants (+91, 91, or 10 digits)
const getPhoneVariants = (phone) => {
  if (!phone) return [];
  const str = phone.toString().trim();
  const digits = str.replace(/\D/g, '');
  const variants = new Set();
  variants.add(str);
  if (digits) {
    variants.add(digits);
    if (digits.length === 10) {
      variants.add(`+91${digits}`);
      variants.add(`91${digits}`);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      const tenDigits = digits.slice(2);
      variants.add(tenDigits);
      variants.add(`+91${tenDigits}`);
    }
  }
  return Array.from(variants);
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register user (Step 1) - Send OTP to email or phone
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    // We accept 'identifier' (which could be email or phone) or fallback to 'email' / 'phoneNumber'
    const identifier = (req.body.identifier || req.body.email || req.body.phoneNumber || '').toString().trim();
    const name = req.body.name || 'User';

    console.log(`📥 Received register request for: ${identifier}`);

    if (!identifier) {
      res.status(400);
      throw new Error('Please enter email or phone number');
    }

    const isEmailIdentifier = isEmail(identifier);
    const query = isEmailIdentifier 
      ? { email: identifier.toLowerCase() } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) } };

    // Check if user already exists
    const userExists = await User.findOne(query);
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this ' + (isEmailIdentifier ? 'email' : 'phone number'));
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save/update pending registration with OTP in database
    const otpQuery = isEmailIdentifier 
      ? { email: identifier.toLowerCase(), purpose: 'register' } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) }, purpose: 'register' };

    const otpUpdate = isEmailIdentifier 
      ? { otp, name, purpose: 'register', email: identifier.toLowerCase(), createdAt: Date.now() }
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
      res.status(200).json({ message: 'OTP sent via SMS to your mobile number. Please verify.' });
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
    const identifier = (req.body.identifier || req.body.email || req.body.phoneNumber || '').toString().trim();
    const otp = (req.body.otp || '').toString().trim();

    if (!identifier || !otp) {
      res.status(400);
      throw new Error('Please enter email/phone and OTP');
    }

    const isEmailIdentifier = isEmail(identifier);
    const otpQuery = isEmailIdentifier 
      ? { email: identifier.toLowerCase(), purpose: 'register' } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) }, purpose: 'register' };

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

    const userQuery = isEmailIdentifier 
      ? { email: identifier.toLowerCase() } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) } };

    // Check if user already exists (edge case: double submit)
    const userExists = await User.findOne(userQuery);
    if (userExists) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400);
      throw new Error('User already exists');
    }

    // Create user
    const newUserObj = { name: otpRecord.name || 'User' };
    if (isEmailIdentifier) {
      newUserObj.email = identifier.toLowerCase();
    } else {
      newUserObj.phoneNumber = identifier;
    }

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

// @desc    Login user (Step 1) - Send OTP to email or phone
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const identifier = (req.body.identifier || req.body.email || req.body.phoneNumber || '').toString().trim();

    if (!identifier) {
      res.status(400);
      throw new Error('Please enter your email or phone number');
    }

    const isEmailIdentifier = isEmail(identifier);
    const query = isEmailIdentifier 
      ? { email: identifier.toLowerCase() } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) } };

    // Check if user exists
    const user = await User.findOne(query);
    if (!user) {
      res.status(404);
      throw new Error('No account found with this ' + (isEmailIdentifier ? 'email' : 'phone number') + '. Please signup first.');
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP with purpose 'login'
    const otpQuery = isEmailIdentifier 
      ? { email: identifier.toLowerCase(), purpose: 'login' } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) }, purpose: 'login' };

    const otpUpdate = isEmailIdentifier 
      ? { otp, purpose: 'login', email: identifier.toLowerCase(), createdAt: Date.now() }
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
      res.status(200).json({ message: 'Login OTP sent via SMS to your mobile number.' });
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
    const identifier = (req.body.identifier || req.body.email || req.body.phoneNumber || '').toString().trim();
    const otp = (req.body.otp || '').toString().trim();

    if (!identifier || !otp) {
      res.status(400);
      throw new Error('Please enter email/phone and OTP');
    }

    const isEmailIdentifier = isEmail(identifier);
    const otpQuery = isEmailIdentifier 
      ? { email: identifier.toLowerCase(), purpose: 'login' } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) }, purpose: 'login' };

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
    const userQuery = isEmailIdentifier 
      ? { email: identifier.toLowerCase() } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) } };
    const user = await User.findOne(userQuery);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }


    // Detect from user-agent if missing or incorrect
    const userAgent = req.headers['user-agent'] || '';
    let platformHeader = req.headers['x-platform'] || req.headers['platform'] || req.query.platform;
    
    if (!platformHeader || platformHeader === 'web') {
        if (/iPad|iPhone|iPod|iOS/i.test(userAgent)) platformHeader = 'ios';
        else if (/Android/i.test(userAgent)) platformHeader = 'android';
        else platformHeader = 'android'; // default to android
    }

    const platform = (platformHeader || 'android').toLowerCase();

    // Fetch AppConfig
    let appVersionInfo = null;
    let versionHeader = req.headers['x-app-version'] || req.headers['app-version'] || req.query.version;
    
    if (platform === 'android' || platform === 'ios') {
      appVersionInfo = await AppConfig.findOne({ platform, is_active: true }).select('-__v -createdAt -updatedAt -_id');
      if (appVersionInfo) {
        const actualLatest = appVersionInfo.latest_version || '1.0.6';
        let originalUserVersion = req.headers['x-app-version'] || req.headers['app-version'] || req.query.version;
        if (!originalUserVersion) {
          originalUserVersion = actualLatest;
        }

        appVersionInfo = appVersionInfo.toObject();

        const isOlder = compareVersions(originalUserVersion, actualLatest) < 0;

        if (!isOlder) {
          // User is on latest version or newer - no popup
          appVersionInfo = null;
        } else {
          appVersionInfo.forceUpdate = Boolean(appVersionInfo.force_update);
          appVersionInfo.latest_version = actualLatest;
        }

        versionHeader = originalUserVersion;
      }
    }

    // Update user's app version and platform
    user.platform = platform;
    user.appVersion = versionHeader || '1.0.6';
    await user.save();

    // Delete OTP record after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    // Check subscription validity
    const subStatus = await user.checkSubscriptionValidity();

    // Return user data with JWT token → Frontend takes user to Home Screen
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      isSubscribed: subStatus.isSubscribed,
      subscriptionDaysLeft: subStatus.daysLeft,
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
      // Detect from user-agent if missing or incorrect
      const userAgent = req.headers['user-agent'] || '';
      let platformHeader = req.headers['x-platform'] || req.headers['platform'] || req.query.platform;
      
      if (!platformHeader || platformHeader === 'web') {
          if (/iPad|iPhone|iPod|iOS/i.test(userAgent)) platformHeader = 'ios';
          else if (/Android/i.test(userAgent)) platformHeader = 'android';
          else platformHeader = 'android'; // default to android
      }

      const platform = (platformHeader || 'android').toLowerCase();

      // Fetch AppConfig
      let appVersionInfo = null;
      let versionHeader = req.headers['x-app-version'] || req.headers['app-version'] || req.query.version;
      
      if (platform === 'android' || platform === 'ios') {
        appVersionInfo = await AppConfig.findOne({ platform, is_active: true }).select('-__v -createdAt -updatedAt -_id');
        if (appVersionInfo) {
          const actualLatest = appVersionInfo.latest_version || '1.0.6';
          let originalUserVersion = req.headers['x-app-version'] || req.headers['app-version'] || req.query.version;
          if (!originalUserVersion) {
            originalUserVersion = actualLatest;
          }

          appVersionInfo = appVersionInfo.toObject();

          const isOlder = compareVersions(originalUserVersion, actualLatest) < 0;

          if (!isOlder) {
            // User is on latest version or newer - no popup
            appVersionInfo = null;
          } else {
            appVersionInfo.forceUpdate = Boolean(appVersionInfo.force_update);
            appVersionInfo.latest_version = actualLatest;
          }

          versionHeader = originalUserVersion;
        }
      }

      // Update user's app version and platform
      user.platform = platform;
      user.appVersion = versionHeader || '1.0.6';
      await user.save();

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');

      // Check subscription validity
      const subStatus = await user.checkSubscriptionValidity();

      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        isSubscribed: subStatus.isSubscribed,
        subscriptionDaysLeft: subStatus.daysLeft,
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

// @desc    Resend OTP for both login and register (email or phone)
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    const identifier = (req.body.identifier || req.body.email || req.body.phoneNumber || '').toString().trim();
    let { purpose } = req.body;

    if (!identifier) {
      res.status(400);
      throw new Error('Please enter email or phone number');
    }

    // Default to login if purpose is not provided
    if (!purpose) {
      purpose = 'login';
    }

    const isEmailIdentifier = isEmail(identifier);

    // If login, check if user exists
    if (purpose === 'login') {
      const userQuery = isEmailIdentifier 
        ? { email: identifier.toLowerCase() } 
        : { phoneNumber: { $in: getPhoneVariants(identifier) } };
      const user = await User.findOne(userQuery);
      if (!user) {
        res.status(404);
        throw new Error('No account found with this ' + (isEmailIdentifier ? 'email' : 'phone number') + '. Please signup first.');
      }
    }

    // Generate new 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save new OTP
    const otpQuery = isEmailIdentifier 
      ? { email: identifier.toLowerCase(), purpose } 
      : { phoneNumber: { $in: getPhoneVariants(identifier) }, purpose };

    const otpUpdate = isEmailIdentifier 
      ? { otp, purpose, email: identifier.toLowerCase(), createdAt: Date.now() } 
      : { otp, purpose, phoneNumber: identifier, createdAt: Date.now() };

    await OTP.findOneAndUpdate(
      otpQuery,
      otpUpdate,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send correct message based on identifier and purpose
    if (isEmailIdentifier) {
      if (purpose === 'login') {
        await sendLoginOTP(identifier, otp);
      } else {
        await sendOTPEmail(identifier, otp);
      }
      res.status(200).json({ message: 'OTP resent successfully to your email.' });
    } else {
      if (purpose === 'login') {
        await sendSMSLoginOTP(identifier, otp);
      } else {
        await sendSMSOTP(identifier, otp);
      }
      res.status(200).json({ message: 'OTP resent successfully to your mobile number.' });
    }
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
      if (req.body.name !== undefined && req.body.name.trim() !== '') {
        user.name = req.body.name.trim();
      }

      const hasEmailInReq = req.body.email !== undefined;
      const hasPhoneInReq = req.body.phoneNumber !== undefined;

      const trimmedEmail = hasEmailInReq ? req.body.email.toString().trim() : undefined;
      const trimmedPhone = hasPhoneInReq ? req.body.phoneNumber.toString().trim() : undefined;

      // Calculate future email and phone values
      const nextEmail = hasEmailInReq ? (trimmedEmail || undefined) : (user.email || undefined);
      const nextPhone = hasPhoneInReq ? (trimmedPhone || undefined) : (user.phoneNumber || undefined);

      // Ensure user keeps at least one contact method
      if (!nextEmail && !nextPhone) {
        res.status(400);
        throw new Error('At least one contact method (email or phone number) is required.');
      }

      // Handle email update or removal
      if (hasEmailInReq) {
        if (!trimmedEmail) {
          // Remove email from user profile & database
          user.email = undefined;
        } else {
          const emailToUpdate = trimmedEmail.toLowerCase();
          if (!isEmail(emailToUpdate)) {
            res.status(400);
            throw new Error('Please provide a valid email address');
          }
          const existingEmailUser = await User.findOne({
            email: emailToUpdate,
            _id: { $ne: user._id },
          });
          if (existingEmailUser) {
            res.status(400);
            throw new Error('This email is already in use by another account');
          }
          user.email = emailToUpdate;
        }
      }

      // Handle phone number update or removal
      if (hasPhoneInReq) {
        if (!trimmedPhone) {
          // Remove phone number from user profile & database
          user.phoneNumber = undefined;
        } else {
          const existingPhoneUser = await User.findOne({
            phoneNumber: { $in: getPhoneVariants(trimmedPhone) },
            _id: { $ne: user._id },
          });
          if (existingPhoneUser) {
            res.status(400);
            throw new Error('This phone number is already in use by another account');
          }
          user.phoneNumber = trimmedPhone;
        }
      }

      // Allow updating profile picture in the same API
      if (req.file) {
        const reqHost = req.get('host');
        const reqProtocol = reqHost.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${reqProtocol}://${reqHost}`;
        user.profilePicture = `${baseUrl}/uploads/${req.file.filename}`;
      } else if (req.body.profilePicture !== undefined && req.body.profilePicture.trim() !== '') {
        // Parse base64 if sent from web
        if (req.body.profilePicture.startsWith('data:image')) {
          user.profilePicture = saveBase64Image(req.body.profilePicture, req);
        } else {
          // Only update if it's a valid string, prevent erasing with empty string
          user.profilePicture = req.body.profilePicture;
        }
      }

      const updatedUser = await user.save();

      // Create notification
      await Notification.create({
        user: updatedUser._id,
        title: 'Profile Updated',
        message: 'Your profile details were updated successfully.',
      });

      // Emit socket event for auto-refresh
      const io = req.app.get('io');
      if (io) {
        io.emit('profileUpdated', {
          userId: updatedUser._id,
          profilePicture: updatedUser.profilePicture || '',
          name: updatedUser.name,
          email: updatedUser.email || '',
          phoneNumber: updatedUser.phoneNumber || '',
        });
      }

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email || '',
        phoneNumber: updatedUser.phoneNumber || '',
        profilePicture: updatedUser.profilePicture || '',
        isSubscribed: updatedUser.isSubscribed,
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
        const reqHost = req.get('host');
        const reqProtocol = reqHost.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${reqProtocol}://${reqHost}`;
        user.profilePicture = `${baseUrl}/uploads/${req.file.filename}`;
      } else if (req.body.profilePicture !== undefined) {
        if (req.body.profilePicture.startsWith('data:image')) {
          user.profilePicture = saveBase64Image(req.body.profilePicture, req);
        } else {
          // Fallback if they pass a URL string instead
          user.profilePicture = req.body.profilePicture;
        }
      }

      const updatedUser = await user.save();

      // Create notification
      await Notification.create({
        user: updatedUser._id,
        title: 'Profile Picture Updated',
        message: 'Your profile picture was updated successfully.',
      });

      // Emit socket event for auto-refresh
      const io = req.app.get('io');
      if (io) {
        io.emit('profileUpdated', {
          userId: updatedUser._id,
          profilePicture: updatedUser.profilePicture,
          name: updatedUser.name
        });
      }

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profilePicture: updatedUser.profilePicture,
        isSubscribed: updatedUser.isSubscribed,
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

      // Emit socket event for auto-refresh
      const io = req.app.get('io');
      if (io) {
        io.emit('profileUpdated', {
          userId: updatedUser._id,
          profilePicture: updatedUser.profilePicture,
          name: updatedUser.name
        });
      }

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

