import express from 'express';
import {
  logSteps,
  getStepHistory,
  getTodaySteps,
  updateGoal,
  syncStepsBatch,
  logWaterIntake,
  logBPReading,
  logCarbsIntake,
  logStressScore,
  logMoodEnergy,
  logDailyBiomarkers,
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
router.get('/day', getTodaySteps);
router.get('/date/:date', (req, res, next) => {
  req.query.date = req.params.date;
  getTodaySteps(req, res, next);
});
router.get('/history', getStepHistory);
router.get('/week', getStepHistory);

router.put('/goal', updateGoal);
router.post('/goal', updateGoal);

router.post('/sync', syncStepsBatch);
router.put('/sync', syncStepsBatch);

// Water Intake Logging endpoints
router.post('/water', logWaterIntake);
router.put('/water', logWaterIntake);
router.post('/water/add', logWaterIntake);
router.put('/water/add', logWaterIntake);
router.post('/water/set', logWaterIntake);
router.post('/water/reset', logWaterIntake);
router.get('/water', getTodaySteps);

// Blood Pressure Logging endpoints
router.post('/bp', logBPReading);
router.put('/bp', logBPReading);
router.post('/bloodpressure', logBPReading);
router.put('/bloodpressure', logBPReading);

// Carbs Intake Logging endpoints
router.post('/carbs', logCarbsIntake);
router.put('/carbs', logCarbsIntake);
router.post('/carbs/add', logCarbsIntake);

// Stress Score Logging endpoints
router.post('/stress', logStressScore);
router.put('/stress', logStressScore);
router.post('/stress-score', logStressScore);

// Mood & Energy Logging endpoints
router.post('/energy', logMoodEnergy);
router.put('/energy', logMoodEnergy);
router.post('/mood', logMoodEnergy);
router.put('/mood', logMoodEnergy);

// Combined Daily Biomarkers
router.post('/biomarkers', logDailyBiomarkers);
router.put('/biomarkers', logDailyBiomarkers);

export default router;
