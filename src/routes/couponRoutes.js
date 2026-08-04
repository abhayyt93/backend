import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';
import {
  getCoupons,
  applyCoupon,
  addCoupon,
  getAdminCoupons,
  deleteCoupon,
  updateCoupon,
  toggleCouponStatus
} from '../controllers/couponController.js';

const router = express.Router();

// User routes
router.get('/', protect, getCoupons);
router.post('/apply', protect, applyCoupon);

// Admin routes
router.post('/admin/add', protectAdmin, addCoupon);
router.get('/admin/list', protectAdmin, getAdminCoupons);
router.put('/admin/update/:id', protectAdmin, updateCoupon);
router.put('/admin/toggle/:id', protectAdmin, toggleCouponStatus);
router.delete('/admin/delete/:id', protectAdmin, deleteCoupon);

export default router;
