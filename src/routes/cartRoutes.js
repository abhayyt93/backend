import express from 'express';
import { getCart, addToCart, removeFromCart, clearCart } from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCart);

router.route('/add')
  .post(protect, addToCart);

router.route('/remove/:productId')
  .delete(protect, removeFromCart);

router.route('/clear')
  .delete(protect, clearCart);

export default router;
