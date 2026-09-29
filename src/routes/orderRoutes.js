import express from 'express';
import { createCODOrder, createRazorpayOrder, trackOrder, cancelOrder, getUserOrders } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order Placement Endpoints
router.post('/place/cod', protect, createCODOrder);
router.post('/place/razorpay', protect, createRazorpayOrder);

// Alias placement routes just in case the frontend uses /create instead of /place
router.post('/create/cod', protect, createCODOrder);
router.post('/create/razorpay', protect, createRazorpayOrder);

// Order Fetching Endpoints
router.get('/myorders', protect, getUserOrders);
router.get('/', protect, getUserOrders);

// Order Tracking
router.get('/track/:id', protect, trackOrder);

// Order Cancel
router.post('/cancel/:id', protect, cancelOrder);

export default router;
