import express from 'express';
import { getDashboardData, deleteUser, updateOrderStatus } from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// All routes here are protected by protectAdmin middleware
router.get('/dashboard', protectAdmin, getDashboardData);
router.delete('/users/:id', protectAdmin, deleteUser);
router.put('/orders/:id/status', protectAdmin, updateOrderStatus);

export default router;
