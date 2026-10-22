import express from 'express';
import {
  getClinicalSummaryReport,
  saveClinicalReport,
  getReportHistory,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require JWT authentication for all report endpoints
router.use(protect);

// Clinical Summary Report (supports GET & POST)
router.route('/clinical-summary')
  .get(getClinicalSummaryReport)
  .post(getClinicalSummaryReport);

router.route('/clinical-7day')
  .get(getClinicalSummaryReport)
  .post(getClinicalSummaryReport);

router.route('/7-day')
  .get(getClinicalSummaryReport)
  .post(getClinicalSummaryReport);

router.route('/summary')
  .get(getClinicalSummaryReport)
  .post(getClinicalSummaryReport);

// Explicit Save & Download endpoints for Flutter buttons
router.route('/save')
  .post(saveClinicalReport)
  .get(getClinicalSummaryReport);

router.route('/download')
  .post(saveClinicalReport)
  .get(getClinicalSummaryReport);

router.route('/share')
  .post(saveClinicalReport)
  .get(getClinicalSummaryReport);

router.get('/history', getReportHistory);

router.route('/')
  .get(getClinicalSummaryReport)
  .post(saveClinicalReport);

export default router;
