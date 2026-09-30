import express from 'express';
import { getBPScanData, getPlateScanData, getSmartwatchSyncData, getCareCommunityData, getActivityImpactData, getHealthDiaryData } from '../controllers/scanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/bp', protect, getBPScanData);
router.get('/plate', protect, getPlateScanData); // Plate AI Scan

// Premium Features (20% without subscription)
router.get('/smartwatch', protect, getSmartwatchSyncData);
router.get('/care-community', protect, getCareCommunityData);
router.get('/activity-impact', protect, getActivityImpactData);

// Free Features (100% always)
router.get('/health-diary', protect, getHealthDiaryData);

export default router;
