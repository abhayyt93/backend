import express from 'express';
import {
  addCategory,
  getCategories,
  deleteCategory
} from '../controllers/categoryController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// User endpoint
router.get('/user/list', getCategories);

// Admin endpoints
router.post('/admin/add-category', protectAdmin, addCategory);
router.delete('/admin/delete-category/:id', protectAdmin, deleteCategory);

export default router;
