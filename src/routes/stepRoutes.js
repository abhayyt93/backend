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
  .post(logSteps)
  .put(logSteps);

// Explicit endpoints matching frontend naming conventions
router.post('/log', logSteps);
router.put('/log', logSteps);
router.post('/add', logSteps);
router.post('/update', logSteps);
router.put('/update', logSteps);
router.post('/save', logSteps);
router.get('/today', getTodaySteps);
router.post('/today', logSteps);
router.get('/history', getStepHistory);
router.get('/week', getStepHistory);
router.put('/goal', updateGoal);
router.post('/goal', updateGoal);
router.post('/sync', syncStepsBatch);
router.put('/sync', syncStepsBatch);

export default router;
