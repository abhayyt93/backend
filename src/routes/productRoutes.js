import express from 'express';
import { getProducts, getProductById, createProduct } from '../controllers/productController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Get all products
router.get('/', getProducts);

// Get single product
router.get('/:id', getProductById);

// Create product (Admin only)
router.post('/', protectAdmin, createProduct);

export default router;
