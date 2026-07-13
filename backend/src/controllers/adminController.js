import User from '../models/User.js';
import Order from '../models/Order.js';
import jwt from 'jsonwebtoken';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.isAdmin && (await user.matchPassword(password))) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          token: generateToken(user._id),
        }
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
    // 1. Fetch all users
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    // 2. Fetch all orders with user and address info
    const orders = await Order.find({})
      .populate('user', 'name email phoneNumber')
      .populate('deliveryAddress')
      .sort({ createdAt: -1 });

    // 3. Calculate statistics
    const totalUsers = users.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((acc, order) => {
      // Only count paid orders, or count all based on logic. Let's count all non-failed for now.
      return order.paymentStatus !== 'Failed' ? acc + order.amount : acc;
    }, 0);

    // 4. Send combined response
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalRevenue
      },
      users,
      orders
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
