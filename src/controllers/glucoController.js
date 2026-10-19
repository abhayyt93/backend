import GlucoseReading from '../models/GlucoseReading.js';
import MealLog from '../models/MealLog.js';
import StepLog from '../models/StepLog.js';

// @desc    Add a glucose reading (also handles wearble step sync)
// @route   POST /api/gluco/reading
// @access  Private
export const addGlucoseReading = async (req, res) => {
  try {
    const { glucoseLevel, readingTime, notes } = req.body;
    let { timeOfDay, readingType } = req.body;

    const isStepSync =
      readingType === 'Step Sync' ||
      readingType === 'Step' ||
      String(readingType || '').toLowerCase().includes('step') ||
      req.body.steps !== undefined ||
      String(notes || '').toLowerCase().includes('step') ||
      String(notes || '').toLowerCase().includes('wearable');

    // If it's a step sync, auto-default timeOfDay if missing
    if (isStepSync && !timeOfDay) {
      timeOfDay = 'Day';
    }

    if (!glucoseLevel || !timeOfDay) {
      return res.status(400).json({ message: 'Glucose level and time of day are required' });
    }

    // If this is a step sync from the wearable / phone sensor, also update StepLog!
    if (isStepSync) {
      try {
        const rawSteps = req.body.steps ?? glucoseLevel ?? req.body.stepCount ?? 0;
        const parsedSteps = Math.max(0, parseInt(rawSteps, 10) || 0);

        const d = new Date(readingTime || Date.now());
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const targetDate = `${year}-${month}-${day}`;

        const distance = req.body.distance !== undefined ? parseFloat(req.body.distance) : parseFloat((parsedSteps * 0.00075).toFixed(2));
        const calories = req.body.calories !== undefined ? parseInt(req.body.calories, 10) : Math.round(parsedSteps * 0.04);
        const activeMinutes = req.body.activeMinutes !== undefined ? parseInt(req.body.activeMinutes, 10) : Math.round(parsedSteps / 100);

        await StepLog.findOneAndUpdate(
          { user: req.user._id, date: targetDate },
          {
            $set: {
              steps: parsedSteps,
              distance,
              calories,
              activeMinutes,
              source: 'sensor',
            },
            $push: {
              logs: {
                addedSteps: parsedSteps,
                source: 'sensor',
                timestamp: new Date(),
                note: notes || 'Auto-synced from wearable device',
              },
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (stepErr) {
        console.error('Error auto-syncing StepLog from addGlucoseReading:', stepErr);
      }
    }

    const reading = new GlucoseReading({
      user: req.user._id,
      glucoseLevel,
      readingTime: readingTime || Date.now(),
      timeOfDay,
      readingType: readingType || 'Random',
      notes,
    });

    const createdReading = await reading.save();
    res.status(201).json(createdReading);
  } catch (error) {
    console.error('Error in addGlucoseReading:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a meal log
// @route   POST /api/gluco/meal
// @access  Private
export const addMealLog = async (req, res) => {
  try {
    const { mealType, carbs, logTime, status, notes } = req.body;

    if (!mealType || carbs === undefined) {
      return res.status(400).json({ message: 'Meal type and carbs are required' });
    }

    const mealLog = new MealLog({
      user: req.user._id,
      mealType,
      carbs,
      logTime: logTime || Date.now(),
      status: status || 'Logged',
      notes,
    });

    const createdMealLog = await mealLog.save();
    res.status(201).json(createdMealLog);
  } catch (error) {
    console.error('Error in addMealLog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get dashboard data (readings, meals, metrics) for a specific date
// @route   GET /api/gluco/dashboard
// @access  Private
export const getDashboardData = async (req, res) => {
  try {
    const { date } = req.query; // Expected format YYYY-MM-DD
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    }

    // Fetch glucose readings for the day
    const glucoseReadings = await GlucoseReading.find({
      user: req.user._id,
      readingTime: { $gte: startDate, $lte: endDate },
    }).sort({ readingTime: 1 });

    // Fetch meal logs for the day
    const mealLogs = await MealLog.find({
      user: req.user._id,
      logTime: { $gte: startDate, $lte: endDate },
    }).sort({ logTime: 1 });

    // Calculate Metrics
    let avgGlucose = 0;
    let timeInRangePercentage = 0;
    let estA1C = 0.0;
    
    if (glucoseReadings.length > 0) {
      const sum = glucoseReadings.reduce((acc, curr) => acc + curr.glucoseLevel, 0);
      avgGlucose = Math.round(sum / glucoseReadings.length);
      
      // Calculate Est A1C (Formula: (Avg_Glucose + 46.7) / 28.7)
      estA1C = ((avgGlucose + 46.7) / 28.7).toFixed(1);
      
      // Calculate Time in Range (Assuming 70-180 mg/dL is target)
      const inRangeCount = glucoseReadings.filter(r => r.glucoseLevel >= 70 && r.glucoseLevel <= 180).length;
      timeInRangePercentage = Math.round((inRangeCount / glucoseReadings.length) * 100);
    }

    res.json({
      metrics: {
        avgGlucose,
        estA1C: parseFloat(estA1C),
        timeInRangePercentage
      },
      glucoseCurve: glucoseReadings.map(r => ({
        time: r.readingTime,
        level: r.glucoseLevel,
        timeOfDay: r.timeOfDay
      })),
      mealMarkers: mealLogs
    });
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
