import express from 'express';
import { createCODOrder, createRazorpayOrder } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order Placement Endpoints
router.post('/place/cod', protect, createCODOrder);
router.post('/place/razorpay', protect, createRazorpayOrder);

export default router;
