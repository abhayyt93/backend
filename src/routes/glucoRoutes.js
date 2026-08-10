import express from 'express';
import {
  addGlucoseReading,
  addMealLog,
  getDashboardData
} from '../controllers/glucoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.post('/reading', addGlucoseReading);
router.post('/meal', addMealLog);
router.get('/dashboard', getDashboardData);

export default router;
