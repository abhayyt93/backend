import express from 'express';
import {
    initiateReturn,
    getUserReturns,
    getAllReturns,
    updateReturnStatus,
    processReplacement
} from '../controllers/returnController.js';
import { protect } from '../middleware/authMiddleware.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// User routes
router.post('/initiate', protect, initiateReturn);
router.get('/my-returns', protect, getUserReturns);

// Admin routes
router.get('/admin/all', protect, protectAdmin, getAllReturns);
router.put('/admin/status/:returnId', protect, protectAdmin, updateReturnStatus);
router.post('/admin/replace/:returnId', protect, protectAdmin, processReplacement);

export default router;
