import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';

// @desc    Get all active coupons
// @route   GET /api/coupons
// @access  Public
export const getCoupons = async (req, res, next) => {
  try {
    const currentDate = new Date();
    // Only get active coupons that haven't expired
    const coupons = await Coupon.find({
      isActive: true,
      validUntil: { $gte: currentDate }
    }).sort({ createdAt: -1 });

    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

// @desc    Apply a coupon
// @route   POST /api/coupons/apply
// @access  Private
export const applyCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      res.status(400);
      throw new Error('Coupon code is required');
    }

    if (orderAmount === undefined || orderAmount === null) {
      res.status(400);
      throw new Error('Order amount is required to apply a coupon');
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      res.status(404);
      throw new Error('Invalid coupon code');
    }

    if (!coupon.isActive) {
      res.status(400);
      throw new Error('This coupon is no longer active');
    }

    if (new Date(coupon.validUntil) < new Date()) {
      res.status(400);
      throw new Error('This coupon has expired');
    }

    if (orderAmount < coupon.minOrderAmount) {
      res.status(400);
      throw new Error(`Order amount must be at least ₹${coupon.minOrderAmount} to use this coupon`);
    }

    if (coupon.usageLimitPerUser > 0) {
      const usageCount = await Order.countDocuments({
        user: req.user._id,
        couponCode: coupon.code,
        paymentStatus: { $ne: 'Failed' }
      });
      if (usageCount >= coupon.usageLimitPerUser) {
        res.status(400);
        throw new Error('You have exceeded the usage limit for this coupon');
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
    } else if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === 'free_gift') {
       discountAmount = 0; 
    }

    // Ensure we don't discount more than the order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      discountAmount,
      finalAmount: orderAmount - discountAmount,
      couponDetails: {
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        freeGift: coupon.discountType === 'free_gift'
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Create a new coupon
// @route   POST /api/coupons/admin/add
// @access  Private/Admin
export const addCoupon = async (req, res, next) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      validUntil,
      usageLimitPerUser,
      isActive
    } = req.body;

    if (!code || !title || !description || !discountType || !validUntil) {
      res.status(400);
      throw new Error('Please provide all required fields');
    }

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });

    if (couponExists) {
      res.status(400);
      throw new Error('Coupon with this code already exists');
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      title,
      description,
      discountType,
      discountValue: discountValue || 0,
      minOrderAmount: minOrderAmount || 0,
      validUntil,
      usageLimitPerUser: usageLimitPerUser || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons/admin/list
// @access  Private/Admin
export const getAdminCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/admin/delete/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (coupon) {
      await Coupon.deleteOne({ _id: req.params.id });
      res.json({ message: 'Coupon removed successfully' });
    } else {
      res.status(404);
      throw new Error('Coupon not found');
    }
  } catch (error) {
    next(error);
  }
};
