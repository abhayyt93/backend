import express from 'express';
import { 
  createCODOrder, 
  createRazorpayOrder, 
  trackOrder, 
  cancelOrder, 
  getUserOrders, 
  verifyRazorpayPayment,
  handlePaymentFailed
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order Placement Endpoints
router.post('/place/cod', protect, createCODOrder);
router.post('/place/razorpay', protect, createRazorpayOrder);

// Alias placement routes just in case the frontend uses /create instead of /place
router.post('/create/cod', protect, createCODOrder);
router.post('/create/razorpay', protect, createRazorpayOrder);

// Payment Verification Endpoints (In case frontend calls /api/order/verify)
router.post('/verify', protect, verifyRazorpayPayment);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.post('/verify/razorpay', protect, verifyRazorpayPayment);
router.post('/payment-failed', protect, handlePaymentFailed);
router.post('/failed', protect, handlePaymentFailed);

// Order Fetching Endpoints
router.get('/myorders', protect, getUserOrders);
router.get('/', protect, getUserOrders);

// Order Tracking
router.get('/track/:id', protect, trackOrder);

// Order Cancel
router.post('/cancel/:id', protect, cancelOrder);

export default router;
