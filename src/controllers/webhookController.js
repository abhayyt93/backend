import crypto from 'crypto';
import User from '../models/User.js';
import Order from '../models/Order.js';
import RefundRequest from '../models/RefundRequest.js';
import { cancelShiprocketOrder } from '../services/shiprocketService.js';

// @desc    Razorpay Webhook for all events
// @route   POST /api/webhooks/razorpay
// @access  Public
export const razorpayWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers['x-razorpay-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
        const paymentEntity = payload.payment.entity;
        const paymentId = paymentEntity.id;
        const orderId = paymentEntity.order_id;
        const amount = paymentEntity.amount / 100;

        // Check if this is a subscription order (₹149)
        if (amount === 149) {
            // It's a subscription payment
            // We find user by orderId stored in subscriptionDetails
            const user = await User.findOne({ 'subscriptionDetails.orderId': orderId });
            if (user && !user.isSubscribed) {
                 user.isSubscribed = true;
                 user.subscriptionActivatedAt = new Date();
                 user.subscriptionPaymentId = paymentId;
                 await user.save();
                 console.log(`✅ Webhook: Subscription activated for user ${user._id}`);
            } else if (!user) {
                // If the app crashed before verify, the orderId might not be in subscriptionDetails.
                // Razorpay notes could contain user_id if passed during order creation.
                const userId = paymentEntity.notes?.user_id;
                if (userId) {
                    const userById = await User.findById(userId);
                    if (userById && !userById.isSubscribed) {
                        userById.isSubscribed = true;
                        userById.subscriptionActivatedAt = new Date();
                        userById.subscriptionPaymentId = paymentId;
                        await userById.save();
                        console.log(`✅ Webhook: Subscription activated for user ${userId} via notes`);
                    }
                }
            }
        } else {
             // Handle regular order payment capture if needed
        }
    }

    if (event === 'refund.created' || event === 'refund.processed') {
      const refundEntity = payload.refund.entity;
      const paymentId = refundEntity.payment_id;
      const refundAmount = refundEntity.amount / 100;
      const refundId = refundEntity.id;
      const status = event === 'refund.processed' ? 'Refunded' : 'Pending';

      const order = await Order.findOne({ razorpayPaymentId: paymentId });
      if (order) {
        order.orderStatus = 'Cancelled';
        order.refundId = refundId;
        order.refundAmount = refundAmount;
        await order.save();

        // Cancel order in Shiprocket if applicable
        if (order.shiprocketOrderId) {
          try {
            await cancelShiprocketOrder([Number(order.shiprocketOrderId)]);
            console.log(`✅ Webhook: Shiprocket order ${order.shiprocketOrderId} cancelled due to Razorpay refund.`);
          } catch (shiprocketErr) {
            console.error("Warning: Shiprocket cancellation failed during webhook processing:", shiprocketErr.message || shiprocketErr);
          }
        }

        const existingRefund = await RefundRequest.findOne({ order: order._id });
        if (existingRefund) {
          existingRefund.status = status;
          existingRefund.refundAmount = refundAmount;
          existingRefund.refundTransactionId = refundId;
          await existingRefund.save();
        } else {
          await RefundRequest.create({
            user: order.user,
            order: order._id,
            reason: 'Initiated via Razorpay Dashboard',
            status: status,
            refundAmount: refundAmount,
            refundTransactionId: refundId
          });
        }
      } else {
        // Might be a subscription refund
        if (event === 'refund.processed') {
            const user = await User.findOne({ subscriptionPaymentId: paymentId });
            if (user) {
                user.isSubscribed = false;
                await user.save();
                console.log(`✅ Webhook: Subscription revoked for user ${user._id} due to refund`);
            }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).json({ success: false });
  }
};
