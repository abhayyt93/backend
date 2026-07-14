import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Order from '../models/Order.js';
import OTP from '../models/OTP.js';
import Notification from '../models/Notification.js';
import Saveaddress from '../models/Saveaddress.js';
import { sendLoginOTP, sendOTPEmail } from '../config/emailService.js';
import jwt from 'jsonwebtoken';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Admin Signup (Step 1) - Send OTP
// @route   POST /api/admin/signup
// @access  Public
export const adminSignup = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    const userExists = await Admin.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('Admin already exists with this email');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.findOneAndUpdate(
      { email, purpose: 'admin_register' },
      {
        otp,
        password,
        purpose: 'admin_register',
        createdAt: Date.now(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOTPEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'Signup OTP sent to your email. Please verify.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Signup Verify (Step 2)
// @route   POST /api/admin/signup-verify
// @access  Public
export const adminSignupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Please enter email and OTP');
    }

    const otpRecord = await OTP.findOne({ email, purpose: 'admin_register' });

    if (!otpRecord || otpRecord.otp !== otp) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    // Double check user doesn't exist
    const userExists = await Admin.findOne({ email });
    if (userExists) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400);
      throw new Error('Admin already exists with this email');
    }

    const admin = await Admin.create({
      name: 'Admin',
      email,
      password: otpRecord.password
    });

    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully. Please login.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        success: true,
        user: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          isAdmin: true,
          token: generateToken(admin._id),
        },
        message: 'Admin login successful!'
      });
    } else {
      res.status(401);
      throw new Error('Invalid email, password, or not an Admin');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all dashboard data (Master API)
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardData = async (req, res, next) => {
  try {
    // 1. Fetch all users and add isAdmin: false for frontend compatibility
    const usersData = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
    const users = usersData.map(user => ({ ...user, id: user._id, isAdmin: false, phone: user.phoneNumber }));

    // 2. Fetch all orders with user and address info
    const orders = await Order.find({})
      .populate('user', 'name email phoneNumber')
      .populate('deliveryAddress')
      .sort({ createdAt: -1 });

    // 3. Fetch all notifications
    const notifications = await Notification.find({}).sort({ createdAt: -1 });

    // 4. Fetch all saved addresses
    const addresses = await Saveaddress.find({}).populate('user', 'name email').sort({ createdAt: -1 });

    // 5. Calculate statistics
    const totalUsers = users.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((acc, order) => {
      // Only count paid orders, or count all based on logic. Let's count all non-failed for now.
      return order.paymentStatus !== 'Failed' ? acc + order.amount : acc;
    }, 0);

    // 6. Send combined response
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalRevenue,
        totalNotifications: notifications.length,
        totalAddresses: addresses.length
      },
      users,
      orders,
      notifications,
      addresses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Optionally: Delete their orders too, or keep them for records.
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block or Unblock a user
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
export const blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.isBlocked = !user.isBlocked; // Toggle block status
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      isBlocked: user.isBlocked
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a notification for a user
// @route   POST /api/admin/notifications
// @access  Private/Admin
export const createNotification = async (req, res, next) => {
  try {
    const { user, title, message, type } = req.body;

    if (!user || !title || !message) {
      res.status(400);
      throw new Error('Please provide user, title and message');
    }

    if (user === 'all' || user === 'active') {
      const query = user === 'active' ? { isBlocked: false } : {};
      const users = await User.find(query).select('_id');
      
      if (users.length === 0) {
        return res.status(400).json({ success: false, message: 'No users found to send notification' });
      }

      const notifications = users.map(u => ({
        user: u._id,
        title,
        message,
        type: type || 'info'
      }));

      await Notification.insertMany(notifications);

      return res.status(201).json({
        success: true,
        message: `Notification sent to ${users.length} ${user} users successfully`
      });
    }

    // Send to specific user
    const notification = await Notification.create({
      user,
      title,
      message,
      type: type || 'info'
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
