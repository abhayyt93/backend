import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import User from '../models/User.js';

// ---- RAZORPAY & COD LOGIC ----

// @desc    Create a new order (Razorpay)
// @route   POST /api/payment/razorpay/create
// @access  Private
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, deliveryAddressId } = req.body;

    if (!amount || !deliveryAddressId) {
      res.status(400);
      throw new Error('Amount and delivery address are required');
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };

    const razorpayOrder = await instance.orders.create(options);

    // Save initial order in our database as pending
    const order = new Order({
      user: req.user.id,
      deliveryAddress: deliveryAddressId,
      amount,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'Pending',
      razorpayOrderId: razorpayOrder.id,
    });
    
    await order.save();

    res.status(200).json({
      success: true,
      order: razorpayOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payment/razorpay/verify
// @access  Private
export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Find the order and update status
      const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      
      if (!order) {
        res.status(404);
        throw new Error('Order not found in database');
      }

      order.paymentStatus = 'Paid';
      order.razorpayPaymentId = razorpay_payment_id;
      await order.save();

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        order
      });
    } else {
      res.status(400);
      throw new Error('Payment verification failed');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new COD order
// @route   POST /api/payment/cod
// @access  Private
export const createCODOrder = async (req, res, next) => {
  try {
    const { amount, deliveryAddressId } = req.body;

    if (!amount || !deliveryAddressId) {
      res.status(400);
      throw new Error('Amount and delivery address are required');
    }

    const order = new Order({
      user: req.user.id,
      deliveryAddress: deliveryAddressId,
      amount,
      paymentMethod: 'COD',
      paymentStatus: 'Pending', // Will remain pending until delivered
    });
    
    await order.save();

    res.status(201).json({
      success: true,
      message: 'COD order placed successfully',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders
// @route   GET /api/payment/myorders
// @access  Private
export const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('deliveryAddress')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// ---- SAVE PAYMENT METHOD LOGIC ----

// @desc    Save a new payment method (UPI or Bank)
// @route   POST /api/payment/save-method
// @access  Private
export const savePaymentMethod = async (req, res, next) => {
  try {
    const { 
      type, 
      upiId, 
      displayName, 
      accountHolderName, 
      bankName, 
      accountNumber, 
      ifscCode,
      isDefault 
    } = req.body;

    if (!['UPI', 'BANK_ACCOUNT'].includes(type)) {
      console.log('Invalid type received:', type);
      res.status(400);
      throw new Error('Invalid payment method type');
    }

    console.log('User ID from token:', req.user.id);
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Unset current defaults if this new one is default
    if (isDefault) {
      user.savedPaymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    const newMethod = {
      type,
      upiId,
      displayName,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      isDefault: isDefault || false
    };

    user.savedPaymentMethods.push(newMethod);
    console.log('Pushing new method:', newMethod);
    const savedUser = await user.save();
    console.log('Saved user methods length:', savedUser.savedPaymentMethods.length);

    res.status(201).json({
      success: true,
      message: 'Payment method saved successfully',
      savedPaymentMethods: user.savedPaymentMethods
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get user's saved payment methods
// @route   GET /api/payment/saved-methods
// @access  Private
export const getSavedPaymentMethods = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      savedPaymentMethods: user.savedPaymentMethods
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved payment method
// @route   DELETE /api/payment/save-method/:methodId
// @access  Private
export const deletePaymentMethod = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Filter out the method to delete
    user.savedPaymentMethods = user.savedPaymentMethods.filter(
      (method) => method._id.toString() !== req.params.methodId
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment method deleted',
      savedPaymentMethods: user.savedPaymentMethods
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a saved payment method
// @route   PUT /api/payment/save-method/:methodId
// @access  Private
export const updatePaymentMethod = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const methodIndex = user.savedPaymentMethods.findIndex(
      (method) => method._id.toString() === req.params.methodId
    );

    if (methodIndex === -1) {
      res.status(404);
      throw new Error('Payment method not found');
    }

    // Update fields if provided
    const updates = req.body;
    
    // If setting as default, remove default from others
    if (updates.isDefault) {
      user.savedPaymentMethods.forEach(method => method.isDefault = false);
    }

    // Apply updates to the specific method
    Object.keys(updates).forEach(key => {
      user.savedPaymentMethods[methodIndex][key] = updates[key];
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment method updated',
      savedPaymentMethods: user.savedPaymentMethods
    });
  } catch (error) {
    next(error);
  }
};
