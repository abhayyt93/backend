import express from 'express';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  createCODOrder,
  createCODUpfrontOrder,
  verifyCODUpfrontPayment,
  getUserOrders,
  savePaymentMethod,
  getSavedPaymentMethods,
  deletePaymentMethod,
  updatePaymentMethod,
  cancelPendingRazorpayOrder
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order & Payment Flow
router.post('/razorpay/create', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.post('/razorpay/cancel-pending', protect, cancelPendingRazorpayOrder);
router.post('/cod', protect, createCODOrder);
router.post('/cod-upfront/create', protect, createCODUpfrontOrder);
router.post('/cod-upfront/verify', protect, verifyCODUpfrontPayment);
router.get('/myorders', protect, getUserOrders);

// Save Payment Method Flow
router.post('/save-method', protect, savePaymentMethod);
router.get('/saved-methods', protect, getSavedPaymentMethods);
router.delete('/save-method/:methodId', protect, deletePaymentMethod);
router.put('/save-method/:methodId', protect, updatePaymentMethod);

export default router;
