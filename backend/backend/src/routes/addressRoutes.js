import express from 'express';
import { addAddress, getAddresses, updateAddress, deleteAddress } from '../controllers/addressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected Routes
router.route('/')
  .post(protect, addAddress)
  .get(protect, getAddresses);

router.route('/:id')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

export default router;
