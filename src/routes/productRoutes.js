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
  requestProductNotification,
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

// User requests notification when product becomes available (Notify Me)
router.post(['/:id/notify-me', '/:id/notify'], protect, requestProductNotification);

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

// Update product (Admin endpoint) - supports multiple images via upload or body, and /:id directly
const updateProductPaths = [
  '/admin/update-product/:id',
  '/update-product/:id',
  '/admin/product/:id',
  '/product/:id',
  '/:id'
];
router.put(updateProductPaths, protectAdmin, uploadAny, updateProduct);
router.patch(updateProductPaths, protectAdmin, uploadAny, updateProduct);

// Toggle product visibility (Admin endpoint)
const toggleVisibilityPaths = [
  '/admin/toggle-visibility/:id',
  '/toggle-visibility/:id'
];
router.put(toggleVisibilityPaths, protectAdmin, toggleProductVisibility);
router.patch(toggleVisibilityPaths, protectAdmin, toggleProductVisibility);

// Toggle product notification (Admin endpoint - supports toggle-notify and toggle-notification aliases)
const toggleNotifyPaths = [
  '/admin/toggle-notify/:id',
  '/toggle-notify/:id',
  '/admin/toggle-notification/:id',
  '/toggle-notification/:id',
  '/admin/toggle-notifications/:id',
  '/toggle-notifications/:id',
  '/admin/notification/:id',
  '/notification/:id'
];
router.put(toggleNotifyPaths, protectAdmin, toggleProductNotify);
router.patch(toggleNotifyPaths, protectAdmin, toggleProductNotify);
router.post(toggleNotifyPaths, protectAdmin, toggleProductNotify);

// Delete product (Admin endpoint)
router.delete(['/admin/delete-product/:id', '/delete-product/:id', '/:id'], protectAdmin, deleteProduct);

export default router;
