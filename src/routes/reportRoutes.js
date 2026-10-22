import express from 'express';
import {
  getClinicalSummaryReport,
  getReportHistory,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require JWT authentication for all report endpoints
router.use(protect);

// Clinical Summary Report (supports ?days=7, ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD)
router.get('/clinical-summary', getClinicalSummaryReport);
router.get('/clinical-7day', getClinicalSummaryReport);
router.get('/7-day', getClinicalSummaryReport);
router.get('/summary', getClinicalSummaryReport);
router.get('/history', getReportHistory);
router.get('/', getClinicalSummaryReport);

export default router;
