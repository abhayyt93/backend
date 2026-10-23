import express from 'express';
import { getBPScanData, getPlateScanData, getSmartwatchSyncData, getCareCommunityData, getActivityImpactData, getHealthDiaryData } from '../controllers/scanController.js';
import {
  logSteps,
  getStepHistory,
  getTodaySteps,
  updateGoal,
  syncStepsBatch,
  logBPReading,
  logCarbsIntake,
  logStressScore,
  logMoodEnergy,
  logDailyBiomarkers,
} from '../controllers/stepController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// BP Scan & Logging
router.get('/bp', protect, getBPScanData);
router.post('/bp', protect, logBPReading);
router.put('/bp', protect, logBPReading);

// Plate AI Scan & Carbs Logging
router.get('/plate', protect, getPlateScanData);
router.post('/plate', protect, logCarbsIntake);
router.put('/plate', protect, logCarbsIntake);

// Stress Score Scan & Logging
router.post('/stress', protect, logStressScore);
router.put('/stress', protect, logStressScore);

// Mood & Energy Scan & Logging
router.post('/energy', protect, logMoodEnergy);
router.put('/energy', protect, logMoodEnergy);

// Full Biomarkers Sync
router.post('/sync', protect, logDailyBiomarkers);
router.put('/sync', protect, logDailyBiomarkers);

// Premium Features (20% without subscription)
router.get('/smartwatch', protect, getSmartwatchSyncData);
router.post('/smartwatch', protect, logSteps);
router.put('/smartwatch', protect, logSteps);
router.post('/smartwatch/sync', protect, syncStepsBatch);
router.get('/care-community', protect, getCareCommunityData);
router.get('/activity-impact', protect, getActivityImpactData);

// Free Features (100% always)
router.get('/health-diary', protect, getHealthDiaryData);

// Footstep & Activity Aliases
router.post('/steps', protect, logSteps);
router.put('/steps', protect, logSteps);
router.post('/steps/log', protect, logSteps);
router.put('/steps/log', protect, logSteps);
router.post('/steps/add', protect, logSteps);
router.get('/steps/history', protect, getStepHistory);
router.get('/steps/today', protect, getTodaySteps);
router.put('/steps/goal', protect, updateGoal);
router.post('/steps/goal', protect, updateGoal);
router.post('/steps/sync', protect, syncStepsBatch);
router.put('/steps/sync', protect, syncStepsBatch);

export default router;
