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
  deleteNotification
} from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Public Admin routes
router.post('/signup', adminSignup);
router.post('/signup-verify', adminSignupVerify);
router.post('/login', adminLogin);

// All routes below here are protected by protectAdmin middleware
router.get('/dashboard', protectAdmin, getDashboardData);
router.delete('/users/:id', protectAdmin, deleteUser);
router.put('/users/:id/block', protectAdmin, blockUser);

router.put('/orders/:id/status', protectAdmin, updateOrderStatus);

router.post('/notifications', protectAdmin, createNotification);
router.delete('/notifications/:id', protectAdmin, deleteNotification);

export default router;
