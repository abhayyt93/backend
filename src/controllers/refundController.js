import RefundRequest from '../models/RefundRequest.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { createShiprocketReturnOrder } from '../services/shiprocketService.js';
import Razorpay from 'razorpay';

// @desc    Initiate a refund request
// @route   POST /api/refund/initiate
// @access  Private
export const initiateRefund = async (req, res, next) => {
    try {
        const { orderId, reason } = req.body;
        const userId = req.user._id;

        const order = await Order.findById(orderId);
        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        if (order.user.toString() !== userId.toString()) {
            res.status(403);
            throw new Error('Not authorized to refund this order');
        }

        // Check if a refund already exists for this order
        const existingRefund = await RefundRequest.findOne({ order: orderId });
        if (existingRefund) {
            res.status(400);
            throw new Error('Refund request already exists for this order');
        }

        const refundRequest = new RefundRequest({
            user: userId,
            order: orderId,
            reason,
        });

        const savedRequest = await refundRequest.save();

        res.status(201).json({
            success: true,
            message: 'Refund request initiated successfully',
            refundRequest: savedRequest
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get logged in user refunds
// @route   GET /api/refund/my-refunds
// @access  Private
export const getUserRefunds = async (req, res, next) => {
    try {
        const refunds = await RefundRequest.find({ user: req.user._id }).populate('order');
        res.status(200).json({
            success: true,
            refunds
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all refunds (Admin)
// @route   GET /api/refund/admin/all
// @access  Private/Admin
export const getAllRefunds = async (req, res, next) => {
    try {
        const refunds = await RefundRequest.find().populate('user', 'name email').populate('order');
        res.status(200).json({
            success: true,
            refunds
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update Refund Status (Admin) - Approves return and calls Shiprocket
// @route   PUT /api/refund/admin/status/:refundId
// @access  Private/Admin
export const updateRefundStatus = async (req, res, next) => {
    try {
        const { status, adminComment } = req.body;
        const refundRequest = await RefundRequest.findById(req.params.refundId)
            .populate({
                path: 'order',
                populate: { path: 'deliveryAddress' }
            })
            .populate('user');

        if (!refundRequest) {
            res.status(404);
            throw new Error('Refund request not found');
        }

        // If admin is approving, create Shiprocket Return Order
        if (status === 'Approved' && refundRequest.status !== 'Approved') {
            try {
                const shiprocketRes = await createShiprocketReturnOrder(
                    refundRequest, 
                    refundRequest.order, 
                    refundRequest.user
                );
                
                refundRequest.shiprocketReturnOrderId = shiprocketRes.order_id?.toString();
                refundRequest.shiprocketReturnShipmentId = shiprocketRes.shipment_id?.toString();
            } catch (shiprocketErr) {
                console.error("Failed to create shiprocket return:", shiprocketErr);
                res.status(500);
                throw new Error("Failed to push return pickup to Shiprocket: " + shiprocketErr.message);
            }
        }

        refundRequest.status = status;
        if (adminComment) {
            refundRequest.adminComment = adminComment;
        }

        const updatedRequest = await refundRequest.save();

        res.status(200).json({
            success: true,
            message: `Refund request marked as ${status}`,
            refundRequest: updatedRequest
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Process Refund (Admin) - After item is picked up and QC passed
// @route   POST /api/refund/admin/process/:refundId
// @access  Private/Admin
export const processRefundAmount = async (req, res, next) => {
    try {
        const { refundTransactionId } = req.body; // Can be empty if done automatically via Razorpay
        const refundRequest = await RefundRequest.findById(req.params.refundId).populate('order');

        if (!refundRequest) {
            res.status(404);
            throw new Error('Refund request not found');
        }

        if (refundRequest.status === 'Refunded') {
            res.status(400);
            throw new Error('Order has already been refunded');
        }

        const order = refundRequest.order;

        // If it was a Razorpay payment, process refund automatically via Razorpay API
        if (order.paymentMethod === 'RAZORPAY' && order.razorpayPaymentId) {
            try {
                const instance = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET,
                });

                const refund = await instance.payments.refund(order.razorpayPaymentId, {
                    amount: order.amount * 100, // Amount in paise
                });

                refundRequest.refundTransactionId = refund.id; 
            } catch (razorpayErr) {
                console.error("Razorpay Refund Error:", razorpayErr);
                res.status(500);
                throw new Error("Razorpay refund failed: " + (razorpayErr.error?.description || razorpayErr.message));
            }
        } else {
            if (refundTransactionId) {
                refundRequest.refundTransactionId = refundTransactionId;
            }
        }

        refundRequest.status = 'Refunded';
        
        let finalRefundAmount = order.amount;
        // Deduct delivery fee if it's non-refundable (like COD)
        if (order.deliveryFee && !order.isDeliveryFeeRefundable) {
            finalRefundAmount -= order.deliveryFee;
        }
        
        refundRequest.refundAmount = finalRefundAmount;

        const updatedRequest = await refundRequest.save();

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refundRequest: updatedRequest
        });
    } catch (error) {
        next(error);
    }
};
