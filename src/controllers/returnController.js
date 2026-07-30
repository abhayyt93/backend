import Razorpay from 'razorpay';
import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { createShiprocketReturnOrder } from '../services/shiprocketService.js';

// @desc    Initiate a return (Replacement) request
// @route   POST /api/return/initiate
// @access  Private
export const initiateReturn = async (req, res, next) => {
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
            throw new Error('Not authorized to return this order');
        }

        // Check if a return already exists for this order
        const existingReturn = await ReturnRequest.findOne({ order: orderId });
        if (existingReturn) {
            res.status(400);
            throw new Error('Return request already exists for this order');
        }

        const returnRequest = new ReturnRequest({
            user: userId,
            order: orderId,
            reason
        });

        const savedRequest = await returnRequest.save();

        res.status(201).json({
            success: true,
            message: 'Return request initiated successfully',
            returnRequest: savedRequest
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get logged in user returns
// @route   GET /api/return/my-returns
// @access  Private
export const getUserReturns = async (req, res, next) => {
    try {
        const returns = await ReturnRequest.find({ user: req.user._id }).populate('order');
        res.status(200).json({
            success: true,
            returns
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all returns (Admin)
// @route   GET /api/return/admin/all
// @access  Private/Admin
export const getAllReturns = async (req, res, next) => {
    try {
        const returns = await ReturnRequest.find().populate('user', 'name email').populate('order');
        res.status(200).json({
            success: true,
            returns
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update Return Status (Admin) - Approves return and calls Shiprocket
// @route   PUT /api/return/admin/status/:returnId
// @access  Private/Admin
export const updateReturnStatus = async (req, res, next) => {
    try {
        const { status, adminComment } = req.body;
        const returnRequest = await ReturnRequest.findById(req.params.returnId)
            .populate({
                path: 'order',
                populate: { path: 'deliveryAddress' }
            })
            .populate('user');

        if (!returnRequest) {
            res.status(404);
            throw new Error('Return request not found');
        }

        // If admin is approving, create Shiprocket Return Order
        if (status === 'Approved' && returnRequest.status !== 'Approved') {
            try {
                const shiprocketRes = await createShiprocketReturnOrder(
                    returnRequest, 
                    returnRequest.order, 
                    returnRequest.user
                );
                
                returnRequest.shiprocketReturnOrderId = shiprocketRes.order_id?.toString();
                returnRequest.shiprocketReturnShipmentId = shiprocketRes.shipment_id?.toString();
            } catch (shiprocketErr) {
                console.error("Failed to create shiprocket return:", shiprocketErr);
                // We might still want to proceed but maybe throw an error or log it
                res.status(500);
                throw new Error("Failed to push return to Shiprocket: " + shiprocketErr.message);
            }
        }

        returnRequest.status = status;
        if (adminComment) {
            returnRequest.adminComment = adminComment;
        }

        const updatedRequest = await returnRequest.save();

        res.status(200).json({
            success: true,
            message: `Return request marked as ${status}`,
            returnRequest: updatedRequest
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Process Replacement (Admin) - After item is picked up and QC passed
// @route   POST /api/return/admin/replace/:returnId
// @access  Private/Admin
export const processReplacement = async (req, res, next) => {
    try {
        const returnRequest = await ReturnRequest.findById(req.params.returnId).populate('order');

        if (!returnRequest) {
            res.status(404);
            throw new Error('Return request not found');
        }

        if (returnRequest.status === 'Replaced') {
            res.status(400);
            throw new Error('Order has already been replaced');
        }

        // Ideally here you'd push a new zero-value prepaid order to Shiprocket for the replacement item
        // and save its order ID in returnRequest.shiprocketReplacementOrderId

        returnRequest.status = 'Replaced';
        const updatedRequest = await returnRequest.save();

        res.status(200).json({
            success: true,
            message: 'Replacement processed successfully',
            returnRequest: updatedRequest
        });
    } catch (error) {
        next(error);
    }
};
