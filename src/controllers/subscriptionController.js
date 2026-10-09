import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import Setting from '../models/Setting.js';

// @desc    Create a subscription order (Razorpay) - Dynamic price from DB
// @route   POST /api/subscription/create-order
// @access  Private
export const createSubscriptionOrder = async (req, res, next) => {
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    let settings = await Setting.findOne();
    const amountToCharge = settings ? settings.subscriptionAmount : 149;

    const options = {
      amount: amountToCharge * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_sub_${req.user.id}_${Date.now()}`,
      notes: {
        user_id: req.user.id
      }
    };

    const razorpayOrder = await instance.orders.create(options);

    res.status(200).json({
      success: true,
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error("Razorpay Subscription Error:", error);
    next(error);
  }
};

// @desc    Verify Razorpay subscription payment
// @route   POST /api/subscription/verify
// @access  Private
export const verifySubscriptionPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        res.status(404);
        throw new Error('User not found in database');
      }

      user.isSubscribed = true;
      user.subscriptionActivatedAt = new Date();
      user.subscriptionPaymentId = razorpay_payment_id;
      // Keep old structure as fallback
      user.subscriptionDetails = {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        subscribedAt: new Date()
      };
      
      await user.save();

      res.status(200).json({
        success: true,
        isSubscribed: true,
        message: 'Subscription payment verified successfully, features unlocked.',
      });
    } else {
      res.status(400);
      throw new Error('Payment verification failed');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Consume Trial Feature
// @route   POST /api/subscription/trial/consume
// @access  Private
export const consumeTrialFeature = async (req, res, next) => {
  try {
    const { feature } = req.body; 
    
    if (!['plate_scan', 'bp_scan', 'community_post', 'smartwatch_connect'].includes(feature)) {
       res.status(400);
       throw new Error('Invalid trial feature');
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const subStatus = await user.checkSubscriptionValidity();

    if (subStatus.isSubscribed) {
        return res.status(200).json({ success: true, allowed: true, unlimited: true, daysLeft: subStatus.daysLeft });
    }

    const maxTrials = 2;
    const currentUsage = user.trialUsage?.[feature] || 0;

    if (currentUsage >= maxTrials) {
        return res.status(200).json({ 
          success: true, 
          allowed: false, 
          remaining: 0 
        });
    }

    // Atomic increment
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id, [`trialUsage.${feature}`]: { $lt: maxTrials } },
      { $inc: { [`trialUsage.${feature}`]: 1 } },
      { new: true }
    );

    if (!updatedUser) {
      // Meaning someone else consumed it simultaneously and it reached max
      return res.status(200).json({ 
          success: true, 
          allowed: false, 
          remaining: 0 
      });
    }

    res.status(200).json({
        success: true,
        allowed: true,
        remaining: maxTrials - updatedUser.trialUsage[feature]
    });

  } catch (error) {
     next(error);
  }
};

// @desc    Get Subscription Status & Trials
// @route   GET /api/subscription/status
// @access  Private
export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const subStatus = await user.checkSubscriptionValidity();

    res.status(200).json({
      isSubscribed: subStatus.isSubscribed,
      subscriptionDaysLeft: subStatus.daysLeft,
      trials: {
        plate_scan: Math.max(0, 2 - (user.trialUsage?.plate_scan || 0)),
        bp_scan: Math.max(0, 2 - (user.trialUsage?.bp_scan || 0)),
        community_post: Math.max(0, 2 - (user.trialUsage?.community_post || 0)),
        smartwatch_connect: Math.max(0, 2 - (user.trialUsage?.smartwatch_connect || 0))
      }
    });
  } catch (error) {
    next(error);
  }
};
