import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist
} from '../controllers/wishlistController.js';

const router = express.Router();

router.post('/add', protect, addToWishlist);
router.get('/', protect, getWishlist);
router.delete('/remove', protect, removeFromWishlist);

export default router;
