import express from 'express';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  createCODOrder,
  getUserOrders,
  savePaymentMethod,
  getSavedPaymentMethods,
  deletePaymentMethod
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order & Payment Flow
router.post('/razorpay/create', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.post('/cod', protect, createCODOrder);
router.get('/myorders', protect, getUserOrders);

// Save Payment Method Flow
router.post('/save-method', protect, savePaymentMethod);
router.get('/saved-methods', protect, getSavedPaymentMethods);
router.delete('/saved-methods/:methodId', protect, deletePaymentMethod);

export default router;
