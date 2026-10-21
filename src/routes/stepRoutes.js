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

// All step endpoints are protected with user JWT token
router.use(protect);

// Log incoming step requests for debugging
router.use((req, res, next) => {
  console.log(`👣 [STEP REQUEST] ${req.method} ${req.originalUrl}`);
  console.log(`   Headers:`, JSON.stringify(req.headers));
  console.log(`   Query:`, JSON.stringify(req.query));
  console.log(`   Body:`, JSON.stringify(req.body));
  next();
});

// Root step endpoints
router.route('/')
  .get(getStepHistory)
  .post(logSteps)
  .put(logSteps);

// Explicit endpoints matching all possible frontend naming conventions
router.post('/log', logSteps);
router.put('/log', logSteps);
router.post('/add', logSteps);
router.put('/add', logSteps);
router.post('/update', logSteps);
router.put('/update', logSteps);
router.post('/save', logSteps);
router.put('/save', logSteps);
router.post('/sensor', logSteps);
router.put('/sensor', logSteps);
router.post('/sync-sensor', logSteps);
router.put('/sync-sensor', logSteps);
router.post('/pedometer', logSteps);
router.put('/pedometer', logSteps);
router.post('/track', logSteps);
router.put('/track', logSteps);
router.post('/live', logSteps);
router.put('/live', logSteps);

router.get('/today', getTodaySteps);
router.post('/today', logSteps);
router.get('/history', getStepHistory);
router.get('/week', getStepHistory);

router.put('/goal', updateGoal);
router.post('/goal', updateGoal);

router.post('/sync', syncStepsBatch);
router.put('/sync', syncStepsBatch);

export default router;
