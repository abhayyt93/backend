import express from 'express';
import {
  addGlucoseReading,
  addMealLog,
  getDashboardData
} from '../controllers/glucoController.js';
import { getClinicalSummaryReport, saveClinicalReport } from '../controllers/reportController.js';
import { logBPReading, logDailyBiomarkers } from '../controllers/stepController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.post('/reading', addGlucoseReading);
router.post('/meal', addMealLog);
router.get('/dashboard', getDashboardData);
router.get('/clinical-summary', getClinicalSummaryReport);
router.post('/clinical-summary', getClinicalSummaryReport);
router.get('/reports/clinical-summary', getClinicalSummaryReport);
router.post('/reports/clinical-summary', getClinicalSummaryReport);
router.post('/bp', logBPReading);
router.post('/vitals', logDailyBiomarkers);
router.post('/sync', logDailyBiomarkers);

export default router;
