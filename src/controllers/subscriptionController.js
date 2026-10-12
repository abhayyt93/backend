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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      payment_id,
      order_id,
      signature 
    } = req.body;

    const paymentId = razorpay_payment_id || payment_id;
    const orderId = razorpay_order_id || order_id;
    const sig = razorpay_signature || signature;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found in database');
    }

    let isValid = false;

    // Check 1: Standard Razorpay HMAC signature verification
    if (orderId && paymentId && sig) {
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature === sig) {
        isValid = true;
      }
    }

    // Check 2: Direct Razorpay API verification fallback (e.g. mobile orderless checkout)
    if (!isValid && paymentId) {
      try {
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const payment = await instance.payments.fetch(paymentId);

        if (payment && (payment.status === 'captured' || payment.status === 'authorized')) {
          // Check that this payment isn't already claimed by another user
          const alreadyClaimed = await User.findOne({
            subscriptionPaymentId: paymentId,
            _id: { $ne: user._id }
          });

          if (!alreadyClaimed) {
            isValid = true;
          } else {
            res.status(400);
            throw new Error('This payment has already been claimed by another user account');
          }
        }
      } catch (fetchErr) {
        console.error("Razorpay API direct fetch error during subscription verify:", fetchErr.message || fetchErr);
      }
    }

    if (isValid) {
      user.isSubscribed = true;
      user.subscriptionActivatedAt = new Date();
      user.subscriptionPaymentId = paymentId;
      user.subscriptionDetails = {
        orderId: orderId || '',
        paymentId: paymentId,
        signature: sig || '',
        subscribedAt: new Date()
      };
      
      await user.save();

      const subStatus = await user.checkSubscriptionValidity();

      res.status(200).json({
        success: true,
        isSubscribed: true,
        subscriptionDaysLeft: subStatus.daysLeft,
        message: 'Subscription payment verified successfully, features unlocked.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isSubscribed: true,
          subscriptionDaysLeft: subStatus.daysLeft,
          subscriptionDetails: user.subscriptionDetails
        }
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
