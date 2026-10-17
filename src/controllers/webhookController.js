import crypto from 'crypto';
import User from '../models/User.js';
import Order from '../models/Order.js';
import RefundRequest from '../models/RefundRequest.js';
import Saveaddress from '../models/Saveaddress.js';
import { cancelShiprocketOrder } from '../services/shiprocketService.js';
import { sendOrderCancelledSMS } from '../config/smsService.js';

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
        const notes = paymentEntity.notes || {};
        const email = (paymentEntity.email || '').trim().toLowerCase();
        const contact = (paymentEntity.contact || '').trim();

        // If this payment is for an e-commerce Product Order, DO NOT activate subscription!
        if (orderId) {
            const productOrder = await Order.findOne({ razorpayOrderId: orderId });
            if (productOrder) {
                console.log(`ℹ️ Webhook: Payment ${paymentId} is for product order ${productOrder._id}. Skipping subscription activation.`);
                return res.status(200).json({ success: true });
            }
        }

        const isSubNotes = Object.values(notes).some(val => 
          typeof val === 'string' && (val.toLowerCase().includes('subscription') || val.toLowerCase().includes('premium'))
        );
        const isSubDesc = typeof paymentEntity.description === 'string' && 
          (paymentEntity.description.toLowerCase().includes('subscription') || paymentEntity.description.toLowerCase().includes('premium'));

        const isSubscriptionPayment = isSubNotes || isSubDesc || notes.type === 'subscription';

        if (isSubscriptionPayment) {
            let user = null;

            // 1. By orderId in subscriptionDetails
            if (orderId) {
                user = await User.findOne({ 'subscriptionDetails.orderId': orderId });
            }

            // 2. By notes.user_id
            if (!user && notes.user_id) {
                user = await User.findById(notes.user_id);
            }

            // 3. By email
            if (!user && email) {
                user = await User.findOne({ email });
            }

            // 4. By contact / phone number
            if (!user && contact) {
                const rawContact = contact.replace(/\D/g, '');
                const phone10 = rawContact.length >= 10 ? rawContact.slice(-10) : rawContact;
                const phoneVariants = [
                    contact,
                    rawContact,
                    phone10,
                    `+91${phone10}`,
                    `91${phone10}`,
                    `0${phone10}`
                ];
                user = await User.findOne({ phoneNumber: { $in: phoneVariants } });
            }

            if (user) {
                user.isSubscribed = true;
                user.subscriptionActivatedAt = new Date();
                user.subscriptionPaymentId = paymentId;
                user.subscriptionDetails = {
                    orderId: orderId || '',
                    paymentId: paymentId,
                    signature: '',
                    subscribedAt: new Date()
                };
                await user.save();
                console.log(`✅ Webhook: Subscription activated for user ${user._id} (${user.email || user.phoneNumber}) via payment ${paymentId}`);
            } else {
                console.warn(`⚠️ Webhook: Subscription payment captured (${paymentId}) but matching user could not be found. Email: ${email}, Contact: ${contact}`);
            }
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

        // Send Order Cancelled SMS
        try {
          const user = await User.findById(order.user);
          const address = await Saveaddress.findById(order.deliveryAddress);
          const recipientPhone = address?.phoneNumber || user?.phoneNumber;
          if (recipientPhone) {
            sendOrderCancelledSMS(recipientPhone, order._id.toString()).catch(err => {
              console.error("Failed to send webhook order cancelled SMS:", err.message);
            });
          }
        } catch (smsErr) {
          console.error("Error initiating webhook order cancelled SMS:", smsErr.message);
        }

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
