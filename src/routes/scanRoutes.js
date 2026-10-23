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
router.post('/bloodpressure', protect, logBPReading);
router.put('/bloodpressure', protect, logBPReading);
router.post('/blood-pressure', protect, logBPReading);
router.put('/blood-pressure', protect, logBPReading);

// Vitals Logging & Sync endpoints (for "Save & Sync to Vitals Dashboard")
router.get('/vitals', protect, getTodaySteps);
router.post('/vitals', protect, logDailyBiomarkers);
router.put('/vitals', protect, logDailyBiomarkers);
router.post('/vitals/sync', protect, logDailyBiomarkers);
router.put('/vitals/sync', protect, logDailyBiomarkers);
router.post('/vitals/save', protect, logDailyBiomarkers);
router.post('/vitals/log', protect, logDailyBiomarkers);
router.post('/vitals/bp', protect, logBPReading);
router.put('/vitals/bp', protect, logBPReading);
router.post('/vital', protect, logDailyBiomarkers);
router.put('/vital', protect, logDailyBiomarkers);
router.post('/vital/bp', protect, logBPReading);
router.put('/vital/bp', protect, logBPReading);

// Plate AI Scan & Carbs Logging
router.get('/plate', protect, getPlateScanData);
router.post('/plate', protect, logCarbsIntake);
router.put('/plate', protect, logCarbsIntake);
router.post('/carbs', protect, logCarbsIntake);
router.put('/carbs', protect, logCarbsIntake);

// Stress Score Scan & Logging
router.post('/stress', protect, logStressScore);
router.put('/stress', protect, logStressScore);
router.post('/stress-score', protect, logStressScore);
router.post('/stressScore', protect, logStressScore);

// Mood & Energy Scan & Logging
router.post('/energy', protect, logMoodEnergy);
router.put('/energy', protect, logMoodEnergy);
router.post('/mood', protect, logMoodEnergy);
router.put('/mood', protect, logMoodEnergy);
router.post('/mood-energy', protect, logMoodEnergy);

// Full Biomarkers Sync
router.post('/sync', protect, logDailyBiomarkers);
router.put('/sync', protect, logDailyBiomarkers);
router.post('/save', protect, logDailyBiomarkers);
router.post('/log', protect, logDailyBiomarkers);
router.post('/biomarkers', protect, logDailyBiomarkers);
router.put('/biomarkers', protect, logDailyBiomarkers);

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
