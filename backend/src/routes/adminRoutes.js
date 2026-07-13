import express from 'express';
import { getDashboardData, deleteUser, updateOrderStatus, adminLogin } from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Public Admin routes
router.post('/login', adminLogin);

// All routes below here are protected by protectAdmin middleware
router.get('/dashboard', protectAdmin, getDashboardData);
router.delete('/users/:id', protectAdmin, deleteUser);
router.put('/orders/:id/status', protectAdmin, updateOrderStatus);

export default router;
