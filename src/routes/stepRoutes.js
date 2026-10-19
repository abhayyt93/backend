import express from 'express';
import {
  logSteps,
  getStepHistory,
  getTodaySteps,
  updateGoal,
  syncStepsBatch,
} from '../controllers/stepController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Log every step request
router.use((req, res, next) => {
  console.log(`👣 [STEP API HIT] ${req.method} ${req.originalUrl} - Body:`, JSON.stringify(req.body));
  next();
});

// All step endpoints are protected with user JWT token
router.use(protect);

// Root step endpoints
router.route('/')
  .get(getStepHistory)
  .post(logSteps);

// Explicit endpoints matching frontend naming conventions
router.post('/log', logSteps);
router.post('/add', logSteps);
router.get('/today', getTodaySteps);
router.get('/history', getStepHistory);
router.get('/week', getStepHistory);
router.put('/goal', updateGoal);
router.post('/sync', syncStepsBatch);

export default router;
