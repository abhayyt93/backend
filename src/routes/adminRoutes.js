import express from 'express';
import { 
  getDashboardData, 
  deleteUser, 
  updateOrderStatus, 
  adminLogin, 
  adminSignup, 
  adminSignupVerify,
  blockUser,
  createNotification,
  deleteNotification,
  forgotPassword,
  verifyOTP,
  resetPassword,
  toggleMaintenanceMode,
  getMaintenanceMode,
  publishAppUpdate,
  pushOrderToShiprocket,
  cancelOrderInShiprocket,
  trackOrderInShiprocket,
  createReturnInShiprocket,
  updateUser
} from '../controllers/adminController.js';
import { getAdminCoupons, addCoupon, deleteCoupon, updateCoupon, toggleCouponStatus } from '../controllers/couponController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public Admin routes
router.post('/signup', adminSignup);
router.post('/signup-verify', adminSignupVerify);
router.post('/login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// All routes below here are protected by protectAdmin middleware
router.get('/dashboard', protectAdmin, getDashboardData);
router.delete('/users/:id', protectAdmin, deleteUser);
router.put('/users/:id', protectAdmin, upload.single('profilePicture'), updateUser);
router.put('/users/:id/block', protectAdmin, blockUser);

router.put('/orders/:id/status', protectAdmin, updateOrderStatus);

router.post('/notifications', protectAdmin, createNotification);
router.delete('/notifications/:id', protectAdmin, deleteNotification);

router.put('/maintenance', protectAdmin, toggleMaintenanceMode);
router.post('/maintenance', protectAdmin, toggleMaintenanceMode); // Added POST support
router.get('/maintenance', protectAdmin, getMaintenanceMode);

router.post('/updates', protectAdmin, publishAppUpdate); // Publish app updates

// Coupon Management (Direct Admin Routes)
router.get('/coupons', protectAdmin, getAdminCoupons);
router.get('/coupons/list', protectAdmin, getAdminCoupons);
router.post('/coupons/add', protectAdmin, addCoupon);
router.put('/coupons/update/:id', protectAdmin, updateCoupon);
router.put('/coupons/toggle/:id', protectAdmin, toggleCouponStatus);
router.delete('/coupons/:id', protectAdmin, deleteCoupon);

// Shiprocket Management
router.post('/orders/:id/shiprocket/create', protectAdmin, pushOrderToShiprocket);
router.post('/orders/:id/shiprocket/cancel', protectAdmin, cancelOrderInShiprocket);
router.get('/orders/:id/shiprocket/track', protectAdmin, trackOrderInShiprocket);
router.post('/orders/:id/shiprocket/return', protectAdmin, createReturnInShiprocket);

export default router;
