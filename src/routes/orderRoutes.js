import express from 'express';
import { createCODOrder, createRazorpayOrder, trackOrder } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order Placement Endpoints
router.post('/place/cod', protect, createCODOrder);
router.post('/place/razorpay', protect, createRazorpayOrder);

// Order Tracking
router.get('/track/:id', protect, trackOrder);

export default router;
