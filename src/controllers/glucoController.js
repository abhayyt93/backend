import GlucoseReading from '../models/GlucoseReading.js';
import MealLog from '../models/MealLog.js';
import User from '../models/User.js';
import StepLog from '../models/StepLog.js';

// @desc    Add a glucose reading
// @route   POST /api/gluco/reading
// @access  Private
export const addGlucoseReading = async (req, res) => {
  try {
    const { glucoseLevel, readingTime, timeOfDay, readingType, notes } = req.body;

    if (!glucoseLevel || !timeOfDay) {
      return res.status(400).json({ message: 'Glucose level and time of day are required' });
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

    // Fetch user and today's steps
    const user = await User.findById(req.user._id);
    let todayStr;
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch (_) {
      const d = new Date();
      todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const todayStepLog = await StepLog.findOne({ user: req.user._id, date: todayStr });
    const userSteps = todayStepLog ? todayStepLog.steps : (user?.lastStepDate === todayStr ? (user?.todaySteps || 0) : 0);
    const userGoal = todayStepLog ? todayStepLog.goal : (user?.stepGoal || 10000);

    const metricsData = {
      avgGlucose,
      estA1C: parseFloat(estA1C),
      timeInRangePercentage,
      steps: userSteps,
      stepGoal: userGoal,
      todaySteps: userSteps,
    };

    const responsePayload = {
      success: true,
      data: {
        metrics: metricsData,
        glucoseCurve: glucoseReadings.map(r => ({
          time: r.readingTime,
          level: r.glucoseLevel,
          timeOfDay: r.timeOfDay
        })),
        mealMarkers: mealLogs
      },
      metrics: metricsData,
      glucoseCurve: glucoseReadings.map(r => ({
        time: r.readingTime,
        level: r.glucoseLevel,
        timeOfDay: r.timeOfDay
      })),
      mealMarkers: mealLogs
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
