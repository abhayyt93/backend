import StepLog from '../models/StepLog.js';
import User from '../models/User.js';

// Helper: Format Date to YYYY-MM-DD
const formatDateString = (dateObj) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Get list of past N dates ending with today in 'YYYY-MM-DD'
const getPastNDates = (n = 7) => {
  const dates = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(formatDateString(d));
  }
  return dates;
};

// Helper: Get human-readable day label (e.g., 'Tue', 'Yesterday', 'Today')
const getDayLabel = (dateStr, todayStr, yesterdayStr) => {
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. Mon, Tue, Wed
};

// Helper: Calculate distance in km (average 0.75m per stride => 0.00075 km)
const calcDistance = (steps) => {
  return parseFloat(((steps || 0) * 0.00075).toFixed(2));
};

// Helper: Calculate calories burned (approx 40 kcal per 1000 steps => 0.04 kcal/step)
const calcCalories = (steps) => {
  return Math.round((steps || 0) * 0.04);
};

// Helper: Calculate active walking minutes (approx 100 steps per active minute)
const calcActiveMinutes = (steps) => {
  return Math.round((steps || 0) / 100);
};

// @desc    Log or increment footsteps (Quick Add or Sensor Sync)
// @route   POST /api/steps/log
// @route   POST /api/steps
// @route   POST /api/steps/add
// @route   POST /api/steps/update
// @access  Private
export const logSteps = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.record || body.payload || {};

    // Support any field naming convention from Flutter/Wearables
    const rawSteps =
      body.steps ??
      body.stepCount ??
      body.todaySteps ??
      body.totalSteps ??
      body.footsteps ??
      body.count ??
      body.glucoseLevel ??
      body.reading ??
      body.value ??
      nested.steps ??
      nested.stepCount ??
      nested.todaySteps ??
      nested.count ??
      req.query.steps;

    let parsedSteps = parseInt(rawSteps, 10);
    if (isNaN(parsedSteps)) {
      parsedSteps = 0;
    }

    const todayStr = formatDateString(new Date());
    const targetDate = (body.date || nested.date) ? String(body.date || nested.date).trim() : todayStr;

    // Get user default goal
    const user = await User.findById(req.user._id);
    const userGoal = (body.goal || nested.goal) ? parseInt(body.goal || nested.goal, 10) : (user?.stepGoal || 10000);

    // Determine action: 'set' (sensor / sync) vs 'add' (manual quick add)
    let action = (body.action || body.type || '').toLowerCase();
    const source = body.source || nested.source || body.device || 'sensor';
    const note = body.note || nested.note;

    // If action is not explicitly 'add', treat as 'set' / cumulative sensor sync
    if (action !== 'add' && action !== 'increment') {
      action = 'set';
    }

    // Distance, Calories, Active Minutes
    const rawDistance = body.distance ?? nested.distance;
    const rawCalories = body.calories ?? nested.calories;
    const rawActiveMinutes = body.activeMinutes ?? nested.activeMinutes;

    // Find existing log for this user on this date
    let stepLog = await StepLog.findOne({
      user: req.user._id,
      date: targetDate,
    });

    if (!stepLog) {
      // New day log
      const initialSteps = Math.max(0, parsedSteps);
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        steps: initialSteps,
        distance: rawDistance !== undefined ? parseFloat(rawDistance) : calcDistance(initialSteps),
        calories: rawCalories !== undefined ? parseInt(rawCalories, 10) : calcCalories(initialSteps),
        activeMinutes: rawActiveMinutes !== undefined ? parseInt(rawActiveMinutes, 10) : calcActiveMinutes(initialSteps),
        goal: userGoal,
        source,
        logs: [
          {
            addedSteps: initialSteps,
            source,
            timestamp: new Date(),
            note: note || (action === 'set' ? 'Sensor count synchronized' : 'Quick added steps'),
          },
        ],
      });
    } else {
      // Update existing record
      if (action === 'set') {
        // Sensor sync: replace total steps
        stepLog.steps = Math.max(0, parsedSteps);
      } else {
        // Increment
        stepLog.steps = (stepLog.steps || 0) + Math.max(0, parsedSteps);
      }

      stepLog.distance = rawDistance !== undefined ? parseFloat(rawDistance) : calcDistance(stepLog.steps);
      stepLog.calories = rawCalories !== undefined ? parseInt(rawCalories, 10) : calcCalories(stepLog.steps);
      stepLog.activeMinutes = rawActiveMinutes !== undefined ? parseInt(rawActiveMinutes, 10) : calcActiveMinutes(stepLog.steps);
      
      if (body.goal || nested.goal) {
        stepLog.goal = userGoal;
      }
      if (source) {
        stepLog.source = source;
      }

      stepLog.logs.push({
        addedSteps: parsedSteps,
        source,
        timestamp: new Date(),
        note: note || (action === 'set' ? 'Sensor count synchronized' : `Added +${parsedSteps} steps`),
      });
    }

    await stepLog.save();

    // If goal was passed, also update user's profile goal
    if ((body.goal || nested.goal) && user) {
      user.stepGoal = userGoal;
      await user.save();
    }

    // Build today's response payload
    const percentage = Math.min(100, Math.round(((stepLog.steps || 0) / (stepLog.goal || 10000)) * 100));

    res.status(200).json({
      success: true,
      message: 'Footsteps saved successfully',
      data: {
        id: stepLog._id,
        userId: stepLog.user,
        date: stepLog.date,
        steps: stepLog.steps,
        distance: stepLog.distance,
        calories: stepLog.calories,
        activeMinutes: stepLog.activeMinutes,
        goal: stepLog.goal,
        percentage,
        source: stepLog.source,
        updatedAt: stepLog.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get step history for 1 week (past 7 days including today)
// @route   GET /api/steps/history
// @route   GET /api/steps/week
// @route   GET /api/steps
// @access  Private
export const getStepHistory = async (req, res, next) => {
  try {
    const daysCount = parseInt(req.query.days, 10) || 7;
    const pastDates = getPastNDates(daysCount);
    const todayStr = pastDates[pastDates.length - 1];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateString(yesterday);

    const user = await User.findById(req.user._id);
    const defaultGoal = user?.stepGoal || 10000;

    // If phone passed current steps via query param (?steps=) or header (x-steps:), auto-save/sync them!
    const querySteps = parseInt(req.query.steps, 10);
    const headerSteps = parseInt(req.headers['x-steps'], 10);
    const incomingSteps = !isNaN(querySteps) && querySteps > 0 ? querySteps : (!isNaN(headerSteps) && headerSteps > 0 ? headerSteps : null);

    if (incomingSteps) {
      await StepLog.findOneAndUpdate(
        { user: req.user._id, date: todayStr },
        {
          $set: {
            steps: incomingSteps,
            distance: calcDistance(incomingSteps),
            calories: calcCalories(incomingSteps),
            activeMinutes: calcActiveMinutes(incomingSteps),
            goal: defaultGoal,
            source: 'sensor',
          },
          $push: {
            logs: {
              addedSteps: incomingSteps,
              source: 'sensor',
              timestamp: new Date(),
              note: 'Auto-synced via history request',
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Fetch all logs within these dates for this user
    const stepLogs = await StepLog.find({
      user: req.user._id,
      date: { $in: pastDates },
    });

    const logMap = new Map();
    stepLogs.forEach((log) => {
      logMap.set(log.date, log);
    });

    let totalWeeklySteps = 0;
    let totalWeeklyDistance = 0;
    let totalWeeklyCalories = 0;
    let daysGoalAchieved = 0;

    // Construct full 7-day array ensuring NO missing days (defaulting missing days to 0 without polluting DB)
    const history = pastDates.map((dateStr) => {
      const log = logMap.get(dateStr);
      const steps = log ? log.steps : 0;
      const goal = log?.goal || defaultGoal;
      const distance = log ? log.distance : calcDistance(steps);
      const calories = log ? log.calories : calcCalories(steps);
      const activeMinutes = log ? log.activeMinutes : calcActiveMinutes(steps);
      const completedPercentage = Math.min(100, Math.round((steps / (goal || 10000)) * 100));

      totalWeeklySteps += steps;
      totalWeeklyDistance += distance;
      totalWeeklyCalories += calories;
      if (steps >= goal && steps > 0) daysGoalAchieved += 1;

      return {
        date: dateStr,
        day: getDayLabel(dateStr, todayStr, yesterdayStr),
        steps,
        distance,
        calories,
        activeMinutes,
        goal,
        completedPercentage,
        isGoalAchieved: steps >= goal && steps > 0,
      };
    });

    // Today's specific object for top card display
    const todayLog = history[history.length - 1];

    res.status(200).json({
      success: true,
      today: {
        date: todayLog.date,
        steps: todayLog.steps,
        goal: todayLog.goal,
        percentage: todayLog.completedPercentage,
        distance: todayLog.distance,
        calories: todayLog.calories,
        activeMinutes: todayLog.activeMinutes,
        isGoalAchieved: todayLog.isGoalAchieved,
      },
      history,
      weeklyTotals: {
        totalSteps: totalWeeklySteps,
        averageSteps: Math.round(totalWeeklySteps / daysCount),
        totalDistance: parseFloat(totalWeeklyDistance.toFixed(2)),
        totalCalories: totalWeeklyCalories,
        daysGoalAchieved,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's footsteps summary
// @route   GET /api/steps/today
// @access  Private
export const getTodaySteps = async (req, res, next) => {
  try {
    const todayStr = formatDateString(new Date());
    const user = await User.findById(req.user._id);
    const defaultGoal = user?.stepGoal || 10000;

    const log = await StepLog.findOne({
      user: req.user._id,
      date: todayStr,
    });

    const steps = log ? log.steps : 0;
    const goal = log?.goal || defaultGoal;
    const distance = log ? log.distance : calcDistance(steps);
    const calories = log ? log.calories : calcCalories(steps);
    const activeMinutes = log ? log.activeMinutes : calcActiveMinutes(steps);
    const percentage = Math.min(100, Math.round((steps / (goal || 10000)) * 100));

    res.status(200).json({
      success: true,
      data: {
        date: todayStr,
        steps,
        goal,
        percentage,
        distance,
        calories,
        activeMinutes,
        isGoalAchieved: steps >= goal,
        logs: log ? log.logs : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update daily step goal (e.g., 5000, 7500, 10000, 12500, 15000)
// @route   PUT /api/steps/goal
// @access  Private
export const updateGoal = async (req, res, next) => {
  try {
    const { goal } = req.body;
    const parsedGoal = parseInt(goal, 10);

    if (isNaN(parsedGoal) || parsedGoal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid target step goal greater than 0',
      });
    }

    // Update user's profile goal
    await User.findByIdAndUpdate(req.user._id, { stepGoal: parsedGoal });

    // Update today's record goal
    const todayStr = formatDateString(new Date());
    let stepLog = await StepLog.findOne({ user: req.user._id, date: todayStr });

    if (stepLog) {
      stepLog.goal = parsedGoal;
      await stepLog.save();
    } else {
      stepLog = await StepLog.create({
        user: req.user._id,
        date: todayStr,
        steps: 0,
        goal: parsedGoal,
      });
    }

    const percentage = Math.min(100, Math.round((stepLog.steps / parsedGoal) * 100));

    res.status(200).json({
      success: true,
      message: 'Step goal updated successfully',
      goal: parsedGoal,
      steps: stepLog.steps,
      percentage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch sync footsteps (e.g. offline queue or wearable device from phone)
// @route   POST /api/steps/sync
// @access  Private
export const syncStepsBatch = async (req, res, next) => {
  try {
    const body = req.body || {};
    let records = [];

    if (Array.isArray(body)) {
      records = body;
    } else if (Array.isArray(body.records)) {
      records = body.records;
    } else if (Array.isArray(body.history)) {
      records = body.history;
    } else if (Array.isArray(body.data)) {
      records = body.data;
    } else if (Array.isArray(body.syncData)) {
      records = body.syncData;
    } else if (Array.isArray(body.list)) {
      records = body.list;
    } else if (typeof body === 'object') {
      const rawSteps = body.steps ?? body.stepCount ?? body.todaySteps ?? body.count ?? body.glucoseLevel;
      if (rawSteps !== undefined) {
        const todayStr = formatDateString(new Date());
        records = [{
          date: body.date || todayStr,
          steps: rawSteps,
          distance: body.distance,
          calories: body.calories,
          activeMinutes: body.activeMinutes,
          goal: body.goal,
          source: body.source || 'sensor',
        }];
      }
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No step records to synchronize',
        count: 0,
      });
    }

    const user = await User.findById(req.user._id);
    const defaultGoal = user?.stepGoal || 10000;
    const updatedRecords = [];
    const todayStr = formatDateString(new Date());

    for (const item of records) {
      if (!item) continue;
      const rawSteps = item.steps ?? item.stepCount ?? item.count ?? item.todaySteps ?? item.glucoseLevel;
      if (rawSteps === undefined || isNaN(parseInt(rawSteps, 10))) continue;

      const dateStr = item.date ? String(item.date).trim() : todayStr;
      const steps = Math.max(0, parseInt(rawSteps, 10));
      const goal = item.goal ? parseInt(item.goal, 10) : defaultGoal;
      const distance = item.distance !== undefined ? parseFloat(item.distance) : calcDistance(steps);
      const calories = item.calories !== undefined ? parseInt(item.calories, 10) : calcCalories(steps);
      const activeMinutes = item.activeMinutes !== undefined ? parseInt(item.activeMinutes, 10) : calcActiveMinutes(steps);

      const record = await StepLog.findOneAndUpdate(
        { user: req.user._id, date: dateStr },
        {
          $set: {
            steps,
            distance,
            calories,
            activeMinutes,
            goal,
            source: item.source || 'sensor',
          },
          $push: {
            logs: {
              addedSteps: steps,
              source: item.source || 'sensor',
              timestamp: new Date(),
              note: 'Batch sync from device',
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      updatedRecords.push(record);
    }

    res.status(200).json({
      success: true,
      message: `Successfully synchronized ${updatedRecords.length} step record(s)`,
      count: updatedRecords.length,
      records: updatedRecords,
    });
  } catch (error) {
    next(error);
  }
};
