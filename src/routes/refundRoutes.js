import express from 'express';
import {
    initiateRefund,
    getUserRefunds,
    getAllRefunds,
    updateRefundStatus,
    processRefundAmount
} from '../controllers/refundController.js';
import { protect } from '../middleware/authMiddleware.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// User routes
router.post('/initiate', protect, initiateRefund);
router.get('/my-refunds', protect, getUserRefunds);

// Admin routes
router.get('/admin/all', protect, protectAdmin, getAllRefunds);
router.put('/admin/status/:refundId', protect, protectAdmin, updateRefundStatus);
router.post('/admin/process/:refundId', protect, protectAdmin, processRefundAmount);

export default router;
