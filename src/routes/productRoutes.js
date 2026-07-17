import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  getProductCategories,
  getBestsellerProducts,
  getProductReviews,
  createProductReview
} from '../controllers/productController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all products (with filters)
router.get('/', getProducts);

// Get distinct product categories
router.get('/categories', getProductCategories);

// Get bestseller products
router.get('/bestsellers', getBestsellerProducts);

// Get single product
router.get('/:id', getProductById);

// Get single product reviews
router.get('/:id/reviews', getProductReviews);

// Add product review
router.post('/:id/reviews', protect, createProductReview);

// Create product (Admin only)
router.post('/', protectAdmin, createProduct);

export default router;
