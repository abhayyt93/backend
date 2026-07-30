import express from 'express';
import {
    initiateReturn,
    getUserReturns,
    getAllReturns,
    updateReturnStatus,
    processReplacement
} from '../controllers/returnController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.post('/initiate', protect, initiateReturn);
router.get('/my-returns', protect, getUserReturns);

// Admin routes
router.get('/admin/all', protect, admin, getAllReturns);
router.put('/admin/status/:returnId', protect, admin, updateReturnStatus);
router.post('/admin/replace/:returnId', protect, admin, processReplacement);

export default router;
