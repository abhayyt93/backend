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
  toggleProductVisibility,
  toggleProductNotify,
  uploadProductImage
} from '../controllers/productController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload, uploadAny } from '../middleware/uploadMiddleware.js';

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
router.post(['/admin/extract-url', '/extract-url'], protectAdmin, extractProductData);

// Upload product image(s) (Admin endpoint) - supports multiple files or single file
router.post(['/admin/upload-image', '/admin/upload-images', '/upload-image', '/upload-images'], protectAdmin, uploadAny, uploadProductImage);

// Create product (Admin endpoint) - supports multiple images via upload or body
router.post(['/admin/add-product', '/add-product'], protectAdmin, uploadAny, createProduct);

// Get all products (Admin endpoint)
router.get(['/admin/list', '/list'], protectAdmin, getAdminProducts);

// Update product (Admin endpoint) - supports multiple images via upload or body
router.put(['/admin/update-product/:id', '/update-product/:id'], protectAdmin, uploadAny, updateProduct);

// Toggle product visibility (Admin endpoint)
router.put(['/admin/toggle-visibility/:id', '/toggle-visibility/:id'], protectAdmin, toggleProductVisibility);

// Toggle product notification (Admin endpoint)
router.put(['/admin/toggle-notify/:id', '/toggle-notify/:id'], protectAdmin, toggleProductNotify);

// Delete product (Admin endpoint)
router.delete(['/admin/delete-product/:id', '/delete-product/:id'], protectAdmin, deleteProduct);

export default router;
