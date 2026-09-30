import express from 'express';
import { getBPScanData, getPlateScanData } from '../controllers/scanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/bp', protect, getBPScanData);
router.get('/plate', protect, getPlateScanData);

export default router;
