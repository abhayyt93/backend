import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  extractProductData,
  getProductCategories,
  getBestsellerProducts,
  getProductReviews,
  createProductReview,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  toggleProductVisibility
} from '../controllers/productController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all products
router.get('/', getProducts);
router.get('/user/list', getProducts);

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

// Extract product data from URL (Admin endpoint)
router.post('/admin/extract-url', protectAdmin, extractProductData);

// Create product (Admin endpoint)
router.post('/admin/add-product', protectAdmin, createProduct);

// Get all products (Admin endpoint)
router.get('/admin/list', protectAdmin, getAdminProducts);

// Update product (Admin endpoint)
router.put('/admin/update-product/:id', protectAdmin, updateProduct);

// Toggle product visibility (Admin endpoint)
router.put('/admin/toggle-visibility/:id', protectAdmin, toggleProductVisibility);

// Delete product (Admin endpoint)
router.delete('/admin/delete-product/:id', protectAdmin, deleteProduct);

export default router;
