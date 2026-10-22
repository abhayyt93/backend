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

// Helper: Get Today's Date String in YYYY-MM-DD (India Standard Time priority for Kosmico)
const getTodayDateString = (req) => {
  const clientDate = req?.body?.date || req?.query?.date;
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(String(clientDate).trim())) {
    return String(clientDate).trim();
  }

  try {
    const istDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(istDate)) {
      return istDate;
    }
  } catch (e) {
    // Fallback if Intl fails
  }

  return formatDateString(new Date());
};

// Helper: Get list of past N dates ending with today in 'YYYY-MM-DD'
const getPastNDates = (n = 7, refDateStr) => {
  const dates = [];
  let baseDate = new Date();
  if (refDateStr && /^\d{4}-\d{2}-\d{2}$/.test(refDateStr)) {
    const [y, m, d] = refDateStr.split('-').map(Number);
    baseDate = new Date(y, m - 1, d, 12, 0, 0);
  }

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    dates.push(formatDateString(d));
  }
  return dates;
};

// Helper: Get human-readable day label (e.g., 'Tue', 'Yesterday', 'Today')
const getDayLabel = (dateStr, todayStr, yesterdayStr) => {
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. Mon, Tue, Wed
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

// @desc    Log or increment footsteps (Quick Add, Sensor Sync, or Manual Entry)
// @route   POST /api/steps/log
// @route   POST /api/steps/add
// @route   POST /api/steps
// @route   PUT /api/steps
// @access  Private
export const logSteps = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.payload || {};

    const rawSteps =
      body.steps ??
      body.addedSteps ??
      body.stepCount ??
      body.count ??
      body.todaySteps ??
      nested.steps ??
      nested.addedSteps ??
      nested.stepCount ??
      req.query.steps ??
      req.query.addedSteps;

    if (rawSteps === undefined || isNaN(parseInt(rawSteps, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Valid step count is required',
      });
    }

    const parsedSteps = parseInt(rawSteps, 10);
    const action = (body.action || nested.action || (req.path.includes('add') ? 'add' : 'auto')).toLowerCase();
    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);

    const user = await User.findById(req.user._id);
    const userGoal = body.goal ? parseInt(body.goal, 10) : (user?.stepGoal || 10000);
    const source = body.source || nested.source || (action === 'add' ? 'manual' : 'sensor');
    const note = body.note || nested.note;

    let stepLog = await StepLog.findOne({
      user: req.user._id,
      date: targetDate,
    });

    if (!stepLog) {
      const initialSteps = Math.max(0, parsedSteps);
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        steps: initialSteps,
        distance: body.distance !== undefined ? parseFloat(body.distance) : calcDistance(initialSteps),
        calories: body.calories !== undefined ? parseInt(body.calories, 10) : calcCalories(initialSteps),
        activeMinutes: body.activeMinutes !== undefined ? parseInt(body.activeMinutes, 10) : calcActiveMinutes(initialSteps),
        goal: userGoal,
        source,
        logs: [
          {
            addedSteps: initialSteps,
            source,
            timestamp: new Date(),
            note: note || (action === 'set' ? 'Sensor count updated' : `Quick added ${initialSteps} steps`),
          },
        ],
      });
    } else {
      let finalSteps = stepLog.steps || 0;
      if (action === 'add' || action === 'increment') {
        finalSteps += parsedSteps;
      } else if (action === 'set' || action === 'replace') {
        if (source === 'sensor') {
          finalSteps = Math.max(stepLog.steps || 0, parsedSteps);
        } else {
          finalSteps = Math.max(0, parsedSteps);
        }
      } else {
        // Auto / sync mode:
        // Manual quick add increases count; sensor sync retains the maximum so count never drops on device switch
        if (source === 'manual' || req.path.includes('add')) {
          finalSteps += parsedSteps;
        } else {
          finalSteps = Math.max(finalSteps, parsedSteps);
        }
      }

      stepLog.steps = finalSteps;
      stepLog.distance = body.distance !== undefined ? parseFloat(body.distance) : calcDistance(stepLog.steps);
      stepLog.calories = body.calories !== undefined ? parseInt(body.calories, 10) : calcCalories(stepLog.steps);
      stepLog.activeMinutes = body.activeMinutes !== undefined ? parseInt(body.activeMinutes, 10) : calcActiveMinutes(stepLog.steps);

      if (body.goal) {
        stepLog.goal = userGoal;
      }
      if (source) {
        stepLog.source = source;
      }

      stepLog.logs.push({
        addedSteps: parsedSteps,
        source,
        timestamp: new Date(),
        note: note || (action === 'set' ? 'Sensor count updated' : `Added steps (+${parsedSteps})`),
      });
    }

    await stepLog.save();

    // Update User model fields
    if (user) {
      if (body.goal) user.stepGoal = userGoal;
      if (targetDate === todayStr) {
        user.todaySteps = stepLog.steps;
        user.lastStepDate = todayStr;
      }
      await user.save();
    }

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
    const todayStr = getTodayDateString(req);
    const pastDates = getPastNDates(daysCount, todayStr);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = pastDates[pastDates.length - 2] || formatDateString(yesterday);

    const user = await User.findById(req.user._id);
    const defaultGoal = user?.stepGoal || 10000;

    // Check if client passed steps in query param or header (e.g. background pedometer hook)
    const rawIncoming = req.query.steps ?? req.query.stepCount ?? req.query.todaySteps ?? req.headers['x-steps'] ?? req.headers['x-step-count'];
    const incomingSteps = rawIncoming !== undefined && !isNaN(parseInt(rawIncoming, 10)) ? parseInt(rawIncoming, 10) : null;

    if (incomingSteps !== null && incomingSteps > 0) {
      let todayDoc = await StepLog.findOne({ user: req.user._id, date: todayStr });
      if (todayDoc) {
        // Keep the higher count so sensor restarts don't wipe footsteps
        if (incomingSteps > (todayDoc.steps || 0)) {
          todayDoc.steps = incomingSteps;
          todayDoc.distance = calcDistance(incomingSteps);
          todayDoc.calories = calcCalories(incomingSteps);
          todayDoc.activeMinutes = calcActiveMinutes(incomingSteps);
          todayDoc.source = 'sensor';
          await todayDoc.save();
        }
      } else {
        await StepLog.create({
          user: req.user._id,
          date: todayStr,
          steps: incomingSteps,
          distance: calcDistance(incomingSteps),
          calories: calcCalories(incomingSteps),
          activeMinutes: calcActiveMinutes(incomingSteps),
          goal: defaultGoal,
          source: 'sensor',
          logs: [{
            addedSteps: incomingSteps,
            source: 'sensor',
            timestamp: new Date(),
            note: 'Auto-synced via history request',
          }],
        });
      }

      if (user) {
        user.todaySteps = Math.max(user.todaySteps || 0, incomingSteps);
        user.lastStepDate = todayStr;
        await user.save();
      }
    }

    // Fetch all logs within these 7 dates for this user
    let stepLogs = await StepLog.find({
      user: req.user._id,
      date: { $in: pastDates },
    });

    // Ensure today's record exists in DB for this user so MongoDB always stores it
    let todayLogDoc = stepLogs.find((l) => l.date === todayStr);
    if (!todayLogDoc) {
      try {
        const initialTodaySteps = (user?.lastStepDate === todayStr && user?.todaySteps) ? user.todaySteps : 0;
        todayLogDoc = await StepLog.create({
          user: req.user._id,
          date: todayStr,
          steps: initialTodaySteps,
          distance: calcDistance(initialTodaySteps),
          calories: calcCalories(initialTodaySteps),
          activeMinutes: calcActiveMinutes(initialTodaySteps),
          goal: defaultGoal,
          source: 'sensor',
          logs: [],
        });
        if (todayLogDoc) stepLogs.push(todayLogDoc);
      } catch (err) {
        todayLogDoc = await StepLog.findOne({ user: req.user._id, date: todayStr });
        if (todayLogDoc) stepLogs.push(todayLogDoc);
      }
    }

    const logMap = new Map();
    stepLogs.forEach((log) => {
      logMap.set(log.date, log);
    });

    let totalWeeklySteps = 0;
    let totalWeeklyDistance = 0;
    let totalWeeklyCalories = 0;
    let daysGoalAchieved = 0;

    // Construct full 7-day array ensuring NO missing days
    const history = pastDates.map((dateStr) => {
      const log = logMap.get(dateStr);
      const steps = log ? (log.steps || 0) : 0;
      const goal = log?.goal || defaultGoal;
      const distance = log ? (log.distance !== undefined ? log.distance : calcDistance(steps)) : calcDistance(steps);
      const calories = log ? (log.calories !== undefined ? log.calories : calcCalories(steps)) : calcCalories(steps);
      const activeMinutes = log ? (log.activeMinutes !== undefined ? log.activeMinutes : calcActiveMinutes(steps)) : calcActiveMinutes(steps);
      const completedPercentage = Math.min(100, Math.round((steps / (goal || 10000)) * 100));

      totalWeeklySteps += steps;
      totalWeeklyDistance += distance;
      totalWeeklyCalories += calories;
      if (steps >= goal) daysGoalAchieved += 1;

      return {
        date: dateStr,
        day: getDayLabel(dateStr, todayStr, yesterdayStr),
        steps,
        distance,
        calories,
        activeMinutes,
        goal,
        completedPercentage,
        isGoalAchieved: steps >= goal,
      };
    });

    // Today's specific object for top card display
    const todayLog = history[history.length - 1];

    const todaySummary = {
      date: todayLog.date,
      day: todayLog.day,
      steps: todayLog.steps,
      todaySteps: todayLog.steps,
      today_steps: todayLog.steps,
      stepCount: todayLog.steps,
      count: todayLog.steps,
      goal: todayLog.goal,
      stepGoal: todayLog.goal,
      percentage: todayLog.completedPercentage,
      completedPercentage: todayLog.completedPercentage,
      distance: todayLog.distance,
      calories: todayLog.calories,
      activeMinutes: todayLog.activeMinutes,
      isGoalAchieved: todayLog.isGoalAchieved,
    };

    // Yesterday's specific object
    const yesterdayLog = history.length >= 2 ? history[history.length - 2] : {
      date: yesterdayStr,
      day: 'Yesterday',
      steps: 0,
      goal: defaultGoal,
      distance: 0,
      calories: 0,
      activeMinutes: 0,
      completedPercentage: 0,
      isGoalAchieved: false,
    };

    const yesterdaySummary = {
      date: yesterdayLog.date,
      day: yesterdayLog.day,
      steps: yesterdayLog.steps,
      yesterdaySteps: yesterdayLog.steps,
      yesterday_steps: yesterdayLog.steps,
      goal: yesterdayLog.goal,
      percentage: yesterdayLog.completedPercentage,
      completedPercentage: yesterdayLog.completedPercentage,
      distance: yesterdayLog.distance,
      calories: yesterdayLog.calories,
      activeMinutes: yesterdayLog.activeMinutes,
      isGoalAchieved: yesterdayLog.isGoalAchieved,
    };

    const weeklySummary = {
      totalSteps: totalWeeklySteps,
      averageSteps: Math.round(totalWeeklySteps / daysCount),
      totalDistance: parseFloat(totalWeeklyDistance.toFixed(2)),
      totalCalories: totalWeeklyCalories,
      daysGoalAchieved,
    };

    res.status(200).json({
      success: true,
      message: 'Step history fetched successfully',
      // Top-level aliases for direct frontend access
      ...todaySummary,
      yesterday: yesterdaySummary,
      yesterdaySteps: yesterdaySummary.steps,
      yesterday_steps: yesterdaySummary.steps,
      today: todaySummary,
      history,
      weeklyTotals: weeklySummary,
      data: {
        ...todaySummary,
        yesterday: yesterdaySummary,
        yesterdaySteps: yesterdaySummary.steps,
        yesterday_steps: yesterdaySummary.steps,
        today: todaySummary,
        history,
        weeklyTotals: weeklySummary,
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
    const todayStr = getTodayDateString(req);
    const user = await User.findById(req.user._id);
    const defaultGoal = user?.stepGoal || 10000;

    // Check if client passed steps in query param or header
    const rawIncoming = req.query.steps ?? req.query.stepCount ?? req.query.todaySteps ?? req.headers['x-steps'] ?? req.headers['x-step-count'];
    const incomingSteps = rawIncoming !== undefined && !isNaN(parseInt(rawIncoming, 10)) ? parseInt(rawIncoming, 10) : null;

    let log = await StepLog.findOne({
      user: req.user._id,
      date: todayStr,
    });

    if (!log) {
      const initialSteps = incomingSteps !== null && incomingSteps > 0 
        ? incomingSteps 
        : ((user?.lastStepDate === todayStr && user?.todaySteps) ? user.todaySteps : 0);

      log = await StepLog.create({
        user: req.user._id,
        date: todayStr,
        steps: initialSteps,
        distance: calcDistance(initialSteps),
        calories: calcCalories(initialSteps),
        activeMinutes: calcActiveMinutes(initialSteps),
        goal: defaultGoal,
        source: 'sensor',
        logs: incomingSteps ? [{
          addedSteps: incomingSteps,
          source: 'sensor',
          timestamp: new Date(),
          note: 'Auto-synced via today request',
        }] : [],
      });
    } else if (incomingSteps !== null && incomingSteps > (log.steps || 0)) {
      log.steps = incomingSteps;
      log.distance = calcDistance(incomingSteps);
      log.calories = calcCalories(incomingSteps);
      log.activeMinutes = calcActiveMinutes(incomingSteps);
      log.source = 'sensor';
      log.logs.push({
        addedSteps: incomingSteps,
        source: 'sensor',
        timestamp: new Date(),
        note: 'Auto-synced via today request',
      });
      await log.save();
    }

    if (incomingSteps !== null && user) {
      user.todaySteps = Math.max(user.todaySteps || 0, incomingSteps);
      user.lastStepDate = todayStr;
      await user.save();
    }

    const steps = log ? (log.steps || 0) : 0;
    const goal = log?.goal || defaultGoal;
    const distance = log ? (log.distance !== undefined ? log.distance : calcDistance(steps)) : calcDistance(steps);
    const calories = log ? (log.calories !== undefined ? log.calories : calcCalories(steps)) : calcCalories(steps);
    const activeMinutes = log ? (log.activeMinutes !== undefined ? log.activeMinutes : calcActiveMinutes(steps)) : calcActiveMinutes(steps);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = formatDateString(yesterdayDate);
    const yesterdayDoc = await StepLog.findOne({ user: req.user._id, date: yesterdayStr });
    const yesterdaySteps = yesterdayDoc ? (yesterdayDoc.steps || 0) : 0;

    const result = {
      date: todayStr,
      steps,
      todaySteps: steps,
      today_steps: steps,
      stepCount: steps,
      count: steps,
      goal,
      stepGoal: goal,
      percentage,
      completedPercentage: percentage,
      distance,
      calories,
      activeMinutes,
      isGoalAchieved: steps >= goal,
      yesterdaySteps,
      yesterday_steps: yesterdaySteps,
      yesterday: {
        date: yesterdayStr,
        day: 'Yesterday',
        steps: yesterdaySteps,
        yesterdaySteps,
        distance: yesterdayDoc ? (yesterdayDoc.distance || 0) : 0,
        calories: yesterdayDoc ? (yesterdayDoc.calories || 0) : 0,
        activeMinutes: yesterdayDoc ? (yesterdayDoc.activeMinutes || 0) : 0,
        goal: yesterdayDoc?.goal || defaultGoal,
        isGoalAchieved: yesterdayDoc ? (yesterdayDoc.steps >= (yesterdayDoc.goal || defaultGoal)) : false,
      },
      logs: log ? log.logs : [],
    };

    res.status(200).json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update daily step goal (e.g., 5000, 7500, 10000, 12500, 15000)
// @route   PUT /api/steps/goal
// @route   POST /api/steps/goal
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
    const todayStr = getTodayDateString(req);
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

    const percentage = Math.min(100, Math.round(((stepLog.steps || 0) / parsedGoal) * 100));

    res.status(200).json({
      success: true,
      message: 'Step goal updated successfully',
      goal: parsedGoal,
      steps: stepLog.steps || 0,
      percentage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch sync footsteps (e.g. offline queue, background pedometer, smartwatch)
// @route   POST /api/steps/sync
// @route   PUT /api/steps/sync
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
      const rawSteps = body.steps ?? body.stepCount ?? body.todaySteps ?? body.count;
      if (rawSteps !== undefined) {
        const todayStr = getTodayDateString(req);
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
        records: [],
      });
    }

    const user = await User.findById(req.user._id);
    const defaultGoal = user?.stepGoal || 10000;
    const updatedRecords = [];
    const todayStr = getTodayDateString(req);

    for (const item of records) {
      if (!item) continue;
      const rawSteps = item.steps ?? item.stepCount ?? item.count ?? item.todaySteps;
      if (rawSteps === undefined || isNaN(parseInt(rawSteps, 10))) continue;

      const dateStr = item.date ? String(item.date).trim() : todayStr;
      const incomingSteps = Math.max(0, parseInt(rawSteps, 10));
      const goal = item.goal ? parseInt(item.goal, 10) : defaultGoal;

      // Find existing record to preserve the maximum steps (avoid wiping out with 0 on device switch)
      const existing = await StepLog.findOne({ user: req.user._id, date: dateStr });
      const finalSteps = existing ? Math.max(existing.steps || 0, incomingSteps) : incomingSteps;

      const distance = item.distance !== undefined ? parseFloat(item.distance) : calcDistance(finalSteps);
      const calories = item.calories !== undefined ? parseInt(item.calories, 10) : calcCalories(finalSteps);
      const activeMinutes = item.activeMinutes !== undefined ? parseInt(item.activeMinutes, 10) : calcActiveMinutes(finalSteps);

      const record = await StepLog.findOneAndUpdate(
        { user: req.user._id, date: dateStr },
        {
          $set: {
            steps: finalSteps,
            distance,
            calories,
            activeMinutes,
            goal,
            source: item.source || 'sensor',
          },
          $push: {
            logs: {
              addedSteps: incomingSteps,
              source: item.source || 'sensor',
              timestamp: new Date(),
              note: 'Batch sync from device',
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (dateStr === todayStr && user) {
        user.todaySteps = finalSteps;
        user.lastStepDate = todayStr;
        await user.save();
      }

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
