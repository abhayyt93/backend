import express from 'express';
import {
    initiateRefund,
    getUserRefunds,
    getAllRefunds,
    updateRefundStatus,
    processRefundAmount
} from '../controllers/refundController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.post('/initiate', protect, initiateRefund);
router.get('/my-refunds', protect, getUserRefunds);

// Admin routes
router.get('/admin/all', protect, admin, getAllRefunds);
router.put('/admin/status/:refundId', protect, admin, updateRefundStatus);
router.post('/admin/process/:refundId', protect, admin, processRefundAmount);

export default router;
