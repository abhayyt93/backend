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

// Helper: Check and normalize sensor steps on 2026-10-23 if yesterday's steps were carried over
const normalizeIncomingSteps = async (userId, targetDate, steps, source, action) => {
  if (steps === undefined || steps === null || isNaN(steps)) return steps;
  let val = Math.max(0, parseInt(steps, 10));

  if (action === 'add' || action === 'increment' || source === 'manual') {
    return val;
  }

  if (targetDate === '2026-10-23') {
    const yesterdayDoc = await StepLog.findOne({ user: userId, date: '2026-10-22' });
    const todayDoc = await StepLog.findOne({ user: userId, date: '2026-10-23' });
    const yesterdaySteps = yesterdayDoc ? (yesterdayDoc.steps || 0) : 0;
    const existingTodaySteps = todayDoc ? (todayDoc.steps || 0) : 0;

    if (yesterdaySteps > 0 && existingTodaySteps > 0) {
      const cumulativeThreshold = existingTodaySteps + yesterdaySteps - 50;
      if (val >= cumulativeThreshold) {
        console.log(`[Sensor Deduct] User ${userId}: Deducting yesterday's ${yesterdaySteps} steps from incoming ${val}`);
        val = Math.max(0, val - yesterdaySteps);
      }
    }
  }

  return val;
};

// Helper: Sync daywise record to User model's dailyActivities array
export const syncUserDailyActivity = async (userId, dateStr, patchData = {}) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      if (!Array.isArray(user.dailyActivities)) {
        user.dailyActivities = [];
      }

      // Check existing StepLog to inherit any non-zero values if patchData didn't supply them
      const existingStepLog = await StepLog.findOne({ user: userId, date: dateStr });

      let item = user.dailyActivities.find((a) => a.date === dateStr);

      const incomingSystolic = patchData.systolic !== undefined && patchData.systolic > 0 ? patchData.systolic : (patchData.bp?.systolic !== undefined && patchData.bp.systolic > 0 ? patchData.bp.systolic : 0);
      const incomingDiastolic = patchData.diastolic !== undefined && patchData.diastolic > 0 ? patchData.diastolic : (patchData.bp?.diastolic !== undefined && patchData.bp.diastolic > 0 ? patchData.bp.diastolic : 0);
      const incomingPulse = patchData.pulse || patchData.bp?.pulse || 0;
      const incomingCarbs = patchData.carbs !== undefined && patchData.carbs > 0 ? patchData.carbs : (patchData.carbsIntake !== undefined && patchData.carbsIntake > 0 ? patchData.carbsIntake : 0);
      const incomingStress = patchData.stressScore !== undefined && patchData.stressScore > 0 ? patchData.stressScore : (patchData.stress !== undefined && patchData.stress > 0 ? patchData.stress : 0);
      const incomingEnergy = patchData.moodAndEnergy !== undefined && patchData.moodAndEnergy > 0 ? patchData.moodAndEnergy : (patchData.energyLevel !== undefined && patchData.energyLevel > 0 ? patchData.energyLevel : (patchData.energy !== undefined && patchData.energy > 0 ? patchData.energy : 0));
      const incomingGlucose = patchData.avgGlucose !== undefined && patchData.avgGlucose > 0 ? patchData.avgGlucose : 0;

      const logSystolic = (existingStepLog?.bp?.systolic && existingStepLog.bp.systolic > 0) ? existingStepLog.bp.systolic : (existingStepLog?.systolic || 0);
      const logDiastolic = (existingStepLog?.bp?.diastolic && existingStepLog.bp.diastolic > 0) ? existingStepLog.bp.diastolic : (existingStepLog?.diastolic || 0);
      const logPulse = existingStepLog?.bp?.pulse || existingStepLog?.pulse || 0;
      const logCarbs = existingStepLog?.carbsIntake || existingStepLog?.carbs || 0;
      const logStress = existingStepLog?.stressScore || existingStepLog?.stress || 0;
      const logEnergy = existingStepLog?.moodAndEnergy || existingStepLog?.energyLevel || existingStepLog?.energy || 0;
      const logGlucose = existingStepLog?.avgGlucose || 0;

      const finalSystolic = incomingSystolic > 0 ? incomingSystolic : (item?.systolic || item?.bp?.systolic || logSystolic);
      const finalDiastolic = incomingDiastolic > 0 ? incomingDiastolic : (item?.diastolic || item?.bp?.diastolic || logDiastolic);
      const finalPulse = incomingPulse > 0 ? incomingPulse : (item?.pulse || item?.bp?.pulse || logPulse);
      const finalCarbs = incomingCarbs > 0 ? incomingCarbs : (item?.carbsIntake || item?.carbs || logCarbs);
      const finalStress = incomingStress > 0 ? incomingStress : (item?.stressScore || item?.stress || logStress);
      const finalEnergy = incomingEnergy > 0 ? incomingEnergy : (item?.moodAndEnergy || item?.energyLevel || item?.energy || logEnergy);
      const finalGlucose = incomingGlucose > 0 ? incomingGlucose : (item?.avgGlucose || logGlucose);
      const bpDisplay = (finalSystolic > 0 && finalDiastolic > 0) ? `${finalSystolic}/${finalDiastolic}` : '0/0';

      if (!item) {
        item = {
          date: dateStr,
          steps: patchData.steps || 0,
          waterIntake: patchData.waterIntake !== undefined ? patchData.waterIntake : (existingStepLog?.waterIntake || 0),
          waterGoal: patchData.waterGoal || user.waterGoal || 2000,
          distance: patchData.distance !== undefined ? patchData.distance : calcDistance(patchData.steps || 0),
          calories: patchData.calories !== undefined ? patchData.calories : calcCalories(patchData.steps || 0),
          activeMinutes: patchData.activeMinutes !== undefined ? patchData.activeMinutes : calcActiveMinutes(patchData.steps || 0),
          stepGoal: patchData.stepGoal || patchData.goal || user.stepGoal || 10000,
          goal: patchData.goal || patchData.stepGoal || user.stepGoal || 10000,
          bp: {
            systolic: finalSystolic,
            diastolic: finalDiastolic,
            pulse: finalPulse,
          },
          systolic: finalSystolic,
          diastolic: finalDiastolic,
          pulse: finalPulse,
          bloodPressure: bpDisplay,
          carbs: finalCarbs,
          carbsIntake: finalCarbs,
          stressScore: finalStress,
          stress: finalStress,
          moodAndEnergy: finalEnergy,
          energyLevel: finalEnergy,
          energy: finalEnergy,
          mood: finalEnergy,
          avgGlucose: finalGlucose,
          source: patchData.source || 'sensor',
          updatedAt: new Date(),
        };
        user.dailyActivities.push(item);
      } else {
        if (patchData.steps !== undefined) item.steps = patchData.steps;
        if (patchData.waterIntake !== undefined) item.waterIntake = patchData.waterIntake;
        if (patchData.waterGoal !== undefined) item.waterGoal = patchData.waterGoal;
        if (patchData.distance !== undefined) item.distance = patchData.distance;
        if (patchData.calories !== undefined) item.calories = patchData.calories;
        if (patchData.activeMinutes !== undefined) item.activeMinutes = patchData.activeMinutes;
        if (patchData.stepGoal !== undefined) item.stepGoal = patchData.stepGoal;
        if (patchData.goal !== undefined) item.goal = patchData.goal;
        if (patchData.source !== undefined) item.source = patchData.source;

        // Update BP safely (never wipe with 0)
        if (!item.bp) item.bp = { systolic: 0, diastolic: 0, pulse: 0 };
        item.bp.systolic = finalSystolic;
        item.bp.diastolic = finalDiastolic;
        item.bp.pulse = finalPulse;
        item.systolic = finalSystolic;
        item.diastolic = finalDiastolic;
        item.pulse = finalPulse;
        item.bloodPressure = bpDisplay;

        // Update Carbs safely
        item.carbs = finalCarbs;
        item.carbsIntake = finalCarbs;

        // Update Stress safely
        item.stressScore = finalStress;
        item.stress = finalStress;

        // Update Mood & Energy safely
        item.moodAndEnergy = finalEnergy;
        item.energyLevel = finalEnergy;
        item.energy = finalEnergy;
        item.mood = finalEnergy;

        // Update Glucose
        item.avgGlucose = finalGlucose;

        item.updatedAt = new Date();
      }

      // Sort chronologically
      user.dailyActivities.sort((a, b) => a.date.localeCompare(b.date));

      const todayStr = getTodayDateString();
      if (dateStr === todayStr) {
        if (patchData.steps !== undefined) user.todaySteps = patchData.steps;
        if (patchData.waterIntake !== undefined) user.todayWater = patchData.waterIntake;
        user.lastStepDate = todayStr;
      }

      user.markModified('dailyActivities');
      await user.save();
      return user;
    } catch (err) {
      if (err.name === 'VersionError' && attempt < 2) {
        console.warn(`[syncUserDailyActivity] Retrying on VersionError (attempt ${attempt + 1})...`);
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        continue;
      }
      console.error('Error in syncUserDailyActivity:', err);
      return null;
    }
  }
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

    const rawWater =
      body.waterIntake ??
      body.water ??
      body.amount ??
      nested.waterIntake ??
      nested.water;

    if (rawSteps === undefined || isNaN(parseInt(rawSteps, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Valid step count is required',
      });
    }

    const action = (body.action || nested.action || (req.path.includes('add') ? 'add' : 'auto')).toLowerCase();
    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);
    const source = body.source || nested.source || (action === 'add' ? 'manual' : 'sensor');
    const parsedSteps = await normalizeIncomingSteps(req.user._id, targetDate, rawSteps, source, action);

    const user = await User.findById(req.user._id);
    const userGoal = body.goal ? parseInt(body.goal, 10) : (user?.stepGoal || 10000);
    const note = body.note || nested.note;

    // Biomarkers extraction if frontend passed them in step payload
    const incomingSystolic = body.systolic !== undefined ? parseInt(body.systolic, 10) : (body.bp?.systolic !== undefined ? parseInt(body.bp.systolic, 10) : (nested.systolic !== undefined ? parseInt(nested.systolic, 10) : undefined));
    const incomingDiastolic = body.diastolic !== undefined ? parseInt(body.diastolic, 10) : (body.bp?.diastolic !== undefined ? parseInt(body.bp.diastolic, 10) : (nested.diastolic !== undefined ? parseInt(nested.diastolic, 10) : undefined));
    const incomingPulse = body.pulse !== undefined ? parseInt(body.pulse, 10) : (body.bp?.pulse !== undefined ? parseInt(body.bp.pulse, 10) : (body.heartRate !== undefined ? parseInt(body.heartRate, 10) : (nested.pulse !== undefined ? parseInt(nested.pulse, 10) : undefined)));
    const incomingCarbs = body.carbs !== undefined ? parseInt(body.carbs, 10) : (body.carbsIntake !== undefined ? parseInt(body.carbsIntake, 10) : (nested.carbs !== undefined ? parseInt(nested.carbs, 10) : undefined));
    const incomingStress = body.stressScore !== undefined ? parseInt(body.stressScore, 10) : (body.stress !== undefined ? parseInt(body.stress, 10) : (nested.stressScore !== undefined ? parseInt(nested.stressScore, 10) : undefined));
    const incomingEnergy = body.moodAndEnergy !== undefined ? parseInt(body.moodAndEnergy, 10) : (body.energyLevel !== undefined ? parseInt(body.energyLevel, 10) : (body.energy !== undefined ? parseInt(body.energy, 10) : (body.mood !== undefined ? parseInt(body.mood, 10) : undefined)));
    const incomingGlucose = body.avgGlucose !== undefined ? parseFloat(body.avgGlucose) : (body.glucose !== undefined ? parseFloat(body.glucose) : undefined);

    let stepLog = await StepLog.findOne({
      user: req.user._id,
      date: targetDate,
    });

    if (!stepLog) {
      const initialSteps = Math.max(0, parsedSteps);
      const initialWater = rawWater !== undefined && !isNaN(parseInt(rawWater, 10)) ? parseInt(rawWater, 10) : 0;
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        steps: initialSteps,
        waterIntake: initialWater,
        waterGoal: user?.waterGoal || 2000,
        distance: body.distance !== undefined ? parseFloat(body.distance) : calcDistance(initialSteps),
        calories: body.calories !== undefined ? parseInt(body.calories, 10) : calcCalories(initialSteps),
        activeMinutes: body.activeMinutes !== undefined ? parseInt(body.activeMinutes, 10) : calcActiveMinutes(initialSteps),
        goal: userGoal,
        source,
        bp: {
          systolic: incomingSystolic || 0,
          diastolic: incomingDiastolic || 0,
          pulse: incomingPulse || 0,
          isManualOrScanned: incomingSystolic !== undefined && incomingSystolic > 0,
        },
        systolic: incomingSystolic || 0,
        diastolic: incomingDiastolic || 0,
        pulse: incomingPulse || 0,
        carbs: incomingCarbs || 0,
        carbsIntake: incomingCarbs || 0,
        stressScore: incomingStress || 0,
        stress: incomingStress || 0,
        moodAndEnergy: incomingEnergy || 0,
        energyLevel: incomingEnergy || 0,
        energy: incomingEnergy || 0,
        mood: incomingEnergy || 0,
        avgGlucose: incomingGlucose || 0,
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

      if (rawWater !== undefined && !isNaN(parseInt(rawWater, 10))) {
        stepLog.waterIntake = parseInt(rawWater, 10);
      }

      if (incomingSystolic !== undefined && incomingSystolic > 0) {
        stepLog.bp = {
          systolic: incomingSystolic,
          diastolic: incomingDiastolic !== undefined ? incomingDiastolic : (stepLog.bp?.diastolic || 0),
          pulse: incomingPulse !== undefined ? incomingPulse : (stepLog.bp?.pulse || 0),
          isManualOrScanned: true,
        };
        stepLog.systolic = incomingSystolic;
        stepLog.diastolic = stepLog.bp.diastolic;
        stepLog.pulse = stepLog.bp.pulse;
        stepLog.bloodPressure = `${incomingSystolic}/${stepLog.bp.diastolic}`;
      }

      if (incomingCarbs !== undefined && incomingCarbs > 0) {
        stepLog.carbs = incomingCarbs;
        stepLog.carbsIntake = incomingCarbs;
      }

      if (incomingStress !== undefined && incomingStress > 0) {
        stepLog.stressScore = incomingStress;
        stepLog.stress = incomingStress;
      }

      if (incomingEnergy !== undefined && incomingEnergy > 0) {
        stepLog.moodAndEnergy = incomingEnergy;
        stepLog.energyLevel = incomingEnergy;
        stepLog.energy = incomingEnergy;
        stepLog.mood = incomingEnergy;
      }

      if (incomingGlucose !== undefined && incomingGlucose > 0) {
        stepLog.avgGlucose = incomingGlucose;
      }

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

    // Sync to User model & User.dailyActivities array
    const updatedUser = await syncUserDailyActivity(req.user._id, targetDate, {
      steps: stepLog.steps,
      waterIntake: stepLog.waterIntake || 0,
      waterGoal: stepLog.waterGoal || user?.waterGoal || 2000,
      distance: stepLog.distance,
      calories: stepLog.calories,
      activeMinutes: stepLog.activeMinutes,
      goal: stepLog.goal,
      stepGoal: stepLog.goal,
      source: stepLog.source,
      bp: stepLog.bp,
      systolic: stepLog.bp?.systolic || stepLog.systolic || 0,
      diastolic: stepLog.bp?.diastolic || stepLog.diastolic || 0,
      pulse: stepLog.bp?.pulse || stepLog.pulse || 0,
      carbs: stepLog.carbs || 0,
      carbsIntake: stepLog.carbsIntake || 0,
      stressScore: stepLog.stressScore || 0,
      stress: stepLog.stressScore || 0,
      moodAndEnergy: stepLog.moodAndEnergy || 0,
      energyLevel: stepLog.energyLevel || 0,
      energy: stepLog.moodAndEnergy || 0,
      mood: stepLog.moodAndEnergy || 0,
      avgGlucose: stepLog.avgGlucose || 0,
    });

    if (user && body.goal) {
      user.stepGoal = userGoal;
      await user.save();
    }

    const percentage = Math.min(100, Math.round(((stepLog.steps || 0) / (stepLog.goal || 10000)) * 100));
    const finalBP = stepLog.bp || { systolic: 0, diastolic: 0, pulse: 0 };
    const bpDisplay = (finalBP.systolic > 0 && finalBP.diastolic > 0) ? `${finalBP.systolic}/${finalBP.diastolic}` : '0/0';

    res.status(200).json({
      success: true,
      message: 'Footsteps saved successfully',
      data: {
        id: stepLog._id,
        userId: stepLog.user,
        date: stepLog.date,
        steps: stepLog.steps,
        waterIntake: stepLog.waterIntake || 0,
        water_intake: stepLog.waterIntake || 0,
        waterGoal: stepLog.waterGoal || 2000,
        distance: stepLog.distance,
        calories: stepLog.calories,
        activeMinutes: stepLog.activeMinutes,
        goal: stepLog.goal,
        percentage,
        bp: finalBP,
        systolic: finalBP.systolic || 0,
        diastolic: finalBP.diastolic || 0,
        pulse: finalBP.pulse || 0,
        bloodPressure: bpDisplay,
        carbs: stepLog.carbs || 0,
        carbsIntake: stepLog.carbsIntake || 0,
        stressScore: stepLog.stressScore || 0,
        moodAndEnergy: stepLog.moodAndEnergy || 0,
        energyLevel: stepLog.energyLevel || 0,
        avgGlucose: stepLog.avgGlucose || 0,
        source: stepLog.source,
        updatedAt: stepLog.updatedAt,
      },
      dailyActivities: updatedUser?.dailyActivities || [],
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
    const incomingSteps = rawIncoming !== undefined && !isNaN(parseInt(rawIncoming, 10))
      ? await normalizeIncomingSteps(req.user._id, todayStr, rawIncoming, 'sensor', 'set')
      : null;

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
      const userAct = user?.dailyActivities?.find((a) => a.date === dateStr);
      const steps = log ? (log.steps || 0) : (userAct ? (userAct.steps || 0) : 0);
      const goal = log?.goal || defaultGoal;
      const waterIntake = log ? (log.waterIntake || 0) : (userAct ? (userAct.waterIntake || 0) : 0);
      const waterGoal = log?.waterGoal || user?.waterGoal || 2000;
      const waterPercentage = Math.min(100, Math.round((waterIntake / (waterGoal || 2000)) * 100));
      const distance = log ? (log.distance !== undefined ? log.distance : calcDistance(steps)) : calcDistance(steps);
      const calories = log ? (log.calories !== undefined ? log.calories : calcCalories(steps)) : calcCalories(steps);
      const activeMinutes = log ? (log.activeMinutes !== undefined ? log.activeMinutes : calcActiveMinutes(steps)) : calcActiveMinutes(steps);
      const completedPercentage = Math.min(100, Math.round((steps / (goal || 10000)) * 100));

      const systolic = (log?.bp?.systolic && log.bp.systolic > 0) ? log.bp.systolic : (userAct?.bp?.systolic || userAct?.systolic || 0);
      const diastolic = (log?.bp?.diastolic && log.bp.diastolic > 0) ? log.bp.diastolic : (userAct?.bp?.diastolic || userAct?.diastolic || 0);
      const pulse = log?.bp?.pulse || userAct?.bp?.pulse || log?.pulse || userAct?.pulse || 0;
      const bpDisplay = (systolic > 0 && diastolic > 0) ? `${systolic}/${diastolic}` : '0/0';
      const carbsIntake = (log?.carbsIntake && log.carbsIntake > 0) ? log.carbsIntake : (userAct?.carbsIntake || userAct?.carbs || 0);
      const stressScore = (log?.stressScore && log.stressScore > 0) ? log.stressScore : (userAct?.stressScore || userAct?.stress || 0);
      const moodAndEnergy = (log?.moodAndEnergy && log.moodAndEnergy > 0) ? log.moodAndEnergy : (userAct?.moodAndEnergy || userAct?.energyLevel || userAct?.energy || 0);
      const avgGlucose = log?.avgGlucose || userAct?.avgGlucose || 0;

      totalWeeklySteps += steps;
      totalWeeklyDistance += distance;
      totalWeeklyCalories += calories;
      if (steps >= goal) daysGoalAchieved += 1;

      return {
        date: dateStr,
        day: getDayLabel(dateStr, todayStr, yesterdayStr),
        steps,
        waterIntake,
        water_intake: waterIntake,
        waterGoal,
        waterPercentage,
        isWaterGoalAchieved: waterIntake >= waterGoal,
        distance,
        calories,
        activeMinutes,
        goal,
        completedPercentage,
        isGoalAchieved: steps >= goal,
        bp: { systolic, diastolic, pulse },
        systolic,
        diastolic,
        pulse,
        bloodPressure: bpDisplay,
        blood_pressure: bpDisplay,
        carbs: carbsIntake,
        carbsIntake,
        carbs_intake: carbsIntake,
        stressScore,
        stress: stressScore,
        stress_score: stressScore,
        moodAndEnergy,
        energyLevel: moodAndEnergy,
        energy: moodAndEnergy,
        mood: moodAndEnergy,
        avgGlucose,
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
      waterIntake: todayLog.waterIntake || 0,
      water_intake: todayLog.waterIntake || 0,
      waterGoal: todayLog.waterGoal || 2000,
      waterPercentage: todayLog.waterPercentage || 0,
      isWaterGoalAchieved: todayLog.isWaterGoalAchieved || false,
      percentage: todayLog.completedPercentage,
      completedPercentage: todayLog.completedPercentage,
      distance: todayLog.distance,
      calories: todayLog.calories,
      activeMinutes: todayLog.activeMinutes,
      isGoalAchieved: todayLog.isGoalAchieved,
      bp: todayLog.bp,
      systolic: todayLog.systolic,
      diastolic: todayLog.diastolic,
      pulse: todayLog.pulse,
      bloodPressure: todayLog.bloodPressure,
      blood_pressure: todayLog.bloodPressure,
      carbs: todayLog.carbs,
      carbsIntake: todayLog.carbsIntake,
      stressScore: todayLog.stressScore,
      stress: todayLog.stress,
      moodAndEnergy: todayLog.moodAndEnergy,
      energyLevel: todayLog.energyLevel,
      energy: todayLog.energy,
      mood: todayLog.mood,
      avgGlucose: todayLog.avgGlucose,
    };

    // Yesterday's specific object
    const yesterdayLog = history.length >= 2 ? history[history.length - 2] : {
      date: yesterdayStr,
      day: 'Yesterday',
      steps: 0,
      waterIntake: 0,
      water_intake: 0,
      waterGoal: 2000,
      waterPercentage: 0,
      isWaterGoalAchieved: false,
      goal: defaultGoal,
      distance: 0,
      calories: 0,
      activeMinutes: 0,
      completedPercentage: 0,
      isGoalAchieved: false,
      bp: { systolic: 0, diastolic: 0, pulse: 0 },
      systolic: 0,
      diastolic: 0,
      pulse: 0,
      bloodPressure: '0/0',
      blood_pressure: '0/0',
      carbs: 0,
      carbsIntake: 0,
      stressScore: 0,
      stress: 0,
      moodAndEnergy: 0,
      energyLevel: 0,
      energy: 0,
      mood: 0,
      avgGlucose: 0,
    };

    const yesterdaySummary = {
      date: yesterdayLog.date,
      day: yesterdayLog.day,
      steps: yesterdayLog.steps,
      yesterdaySteps: yesterdayLog.steps,
      yesterday_steps: yesterdayLog.steps,
      waterIntake: yesterdayLog.waterIntake || 0,
      water_intake: yesterdayLog.waterIntake || 0,
      waterGoal: yesterdayLog.waterGoal || 2000,
      waterPercentage: yesterdayLog.waterPercentage || 0,
      isWaterGoalAchieved: yesterdayLog.isWaterGoalAchieved || false,
      goal: yesterdayLog.goal,
      percentage: yesterdayLog.completedPercentage,
      completedPercentage: yesterdayLog.completedPercentage,
      distance: yesterdayLog.distance,
      calories: yesterdayLog.calories,
      activeMinutes: yesterdayLog.activeMinutes,
      isGoalAchieved: yesterdayLog.isGoalAchieved,
      bp: yesterdayLog.bp,
      systolic: yesterdayLog.systolic,
      diastolic: yesterdayLog.diastolic,
      pulse: yesterdayLog.pulse,
      bloodPressure: yesterdayLog.bloodPressure,
      blood_pressure: yesterdayLog.bloodPressure,
      carbs: yesterdayLog.carbs,
      carbsIntake: yesterdayLog.carbsIntake,
      stressScore: yesterdayLog.stressScore,
      stress: yesterdayLog.stress,
      moodAndEnergy: yesterdayLog.moodAndEnergy,
      energyLevel: yesterdayLog.energyLevel,
      energy: yesterdayLog.energy,
      mood: yesterdayLog.mood,
      avgGlucose: yesterdayLog.avgGlucose,
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
      yesterdayWater: yesterdaySummary.waterIntake,
      yesterday_water: yesterdaySummary.waterIntake,
      today: todaySummary,
      history,
      dailyActivities: user?.dailyActivities || [],
      weeklyTotals: weeklySummary,
      data: {
        ...todaySummary,
        yesterday: yesterdaySummary,
        yesterdaySteps: yesterdaySummary.steps,
        yesterday_steps: yesterdaySummary.steps,
        yesterdayWater: yesterdaySummary.waterIntake,
        yesterday_water: yesterdaySummary.waterIntake,
        today: todaySummary,
        history,
        dailyActivities: user?.dailyActivities || [],
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
    const incomingSteps = rawIncoming !== undefined && !isNaN(parseInt(rawIncoming, 10))
      ? await normalizeIncomingSteps(req.user._id, todayStr, rawIncoming, 'sensor', 'set')
      : null;

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
        waterIntake: user?.todayWater || 0,
        waterGoal: user?.waterGoal || 2000,
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
    const waterIntake = log ? (log.waterIntake || 0) : (user?.todayWater || 0);
    const waterGoal = log?.waterGoal || user?.waterGoal || 2000;
    const waterPercentage = Math.min(100, Math.round((waterIntake / (waterGoal || 2000)) * 100));
    const distance = log ? (log.distance !== undefined ? log.distance : calcDistance(steps)) : calcDistance(steps);
    const calories = log ? (log.calories !== undefined ? log.calories : calcCalories(steps)) : calcCalories(steps);
    const activeMinutes = log ? (log.activeMinutes !== undefined ? log.activeMinutes : calcActiveMinutes(steps)) : calcActiveMinutes(steps);
    const percentage = Math.min(100, Math.round((steps / (goal || 10000)) * 100));
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = formatDateString(yesterdayDate);
    const yesterdayDoc = await StepLog.findOne({ user: req.user._id, date: yesterdayStr });
    const yesterdaySteps = yesterdayDoc ? (yesterdayDoc.steps || 0) : 0;
    const yesterdayWater = yesterdayDoc ? (yesterdayDoc.waterIntake || 0) : 0;

    const userActivity = user?.dailyActivities?.find((a) => a.date === todayStr);
    const systolic = (log?.bp?.systolic && log.bp.systolic > 0) ? log.bp.systolic : (userActivity?.bp?.systolic || userActivity?.systolic || 0);
    const diastolic = (log?.bp?.diastolic && log.bp.diastolic > 0) ? log.bp.diastolic : (userActivity?.bp?.diastolic || userActivity?.diastolic || 0);
    const pulse = log?.bp?.pulse || userActivity?.bp?.pulse || 0;
    const bpDisplay = (systolic > 0 && diastolic > 0) ? `${systolic}/${diastolic}` : '0/0';
    const carbsIntake = (log?.carbsIntake && log.carbsIntake > 0) ? log.carbsIntake : (userActivity?.carbsIntake || userActivity?.carbs || 0);
    const stressScore = (log?.stressScore && log.stressScore > 0) ? log.stressScore : (userActivity?.stressScore || userActivity?.stress || 0);
    const moodAndEnergy = (log?.moodAndEnergy && log.moodAndEnergy > 0) ? log.moodAndEnergy : (userActivity?.moodAndEnergy || userActivity?.energyLevel || userActivity?.energy || 0);
    const avgGlucose = log?.avgGlucose || userActivity?.avgGlucose || 0;

    const yestActivity = user?.dailyActivities?.find((a) => a.date === yesterdayStr);
    const yestSystolic = (yesterdayDoc?.bp?.systolic && yesterdayDoc.bp.systolic > 0) ? yesterdayDoc.bp.systolic : (yestActivity?.bp?.systolic || yestActivity?.systolic || 0);
    const yestDiastolic = (yesterdayDoc?.bp?.diastolic && yesterdayDoc.bp.diastolic > 0) ? yesterdayDoc.bp.diastolic : (yestActivity?.bp?.diastolic || yestActivity?.diastolic || 0);
    const yestPulse = yesterdayDoc?.bp?.pulse || yestActivity?.bp?.pulse || 0;
    const yestBpDisplay = (yestSystolic > 0 && yestDiastolic > 0) ? `${yestSystolic}/${yestDiastolic}` : '0/0';
    const yestCarbs = (yesterdayDoc?.carbsIntake && yesterdayDoc.carbsIntake > 0) ? yesterdayDoc.carbsIntake : (yestActivity?.carbsIntake || yestActivity?.carbs || 0);
    const yestStress = (yesterdayDoc?.stressScore && yesterdayDoc.stressScore > 0) ? yesterdayDoc.stressScore : (yestActivity?.stressScore || yestActivity?.stress || 0);
    const yestEnergy = (yesterdayDoc?.moodAndEnergy && yesterdayDoc.moodAndEnergy > 0) ? yesterdayDoc.moodAndEnergy : (yestActivity?.moodAndEnergy || yestActivity?.energyLevel || yestActivity?.energy || 0);

    const result = {
      date: todayStr,
      steps,
      todaySteps: steps,
      today_steps: steps,
      stepCount: steps,
      count: steps,
      goal,
      stepGoal: goal,
      waterIntake,
      water_intake: waterIntake,
      waterGoal,
      waterPercentage,
      isWaterGoalAchieved: waterIntake >= waterGoal,
      percentage,
      completedPercentage: percentage,
      distance,
      calories,
      activeMinutes,
      isGoalAchieved: steps >= goal,
      bp: { systolic, diastolic, pulse },
      systolic,
      diastolic,
      pulse,
      bloodPressure: bpDisplay,
      blood_pressure: bpDisplay,
      carbs: carbsIntake,
      carbsIntake,
      carbs_intake: carbsIntake,
      stressScore,
      stress: stressScore,
      stress_score: stressScore,
      moodAndEnergy,
      energyLevel: moodAndEnergy,
      energy: moodAndEnergy,
      mood: moodAndEnergy,
      avgGlucose,
      yesterdaySteps,
      yesterday_steps: yesterdaySteps,
      yesterdayWater,
      yesterday_water: yesterdayWater,
      yesterday: {
        date: yesterdayStr,
        day: 'Yesterday',
        steps: yesterdaySteps,
        yesterdaySteps,
        waterIntake: yesterdayWater,
        water_intake: yesterdayWater,
        waterGoal: yesterdayDoc?.waterGoal || 2000,
        distance: yesterdayDoc ? (yesterdayDoc.distance || 0) : 0,
        calories: yesterdayDoc ? (yesterdayDoc.calories || 0) : 0,
        activeMinutes: yesterdayDoc ? (yesterdayDoc.activeMinutes || 0) : 0,
        goal: yesterdayDoc?.goal || defaultGoal,
        isGoalAchieved: yesterdayDoc ? (yesterdayDoc.steps >= (yesterdayDoc.goal || defaultGoal)) : false,
        bp: { systolic: yestSystolic, diastolic: yestDiastolic, pulse: yestPulse },
        systolic: yestSystolic,
        diastolic: yestDiastolic,
        pulse: yestPulse,
        bloodPressure: yestBpDisplay,
        carbs: yestCarbs,
        carbsIntake: yestCarbs,
        stressScore: yestStress,
        moodAndEnergy: yestEnergy,
        energyLevel: yestEnergy,
      },
      dailyActivities: user?.dailyActivities || [],
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
      const incomingSteps = await normalizeIncomingSteps(req.user._id, dateStr, rawSteps, item.source || 'sensor', 'set');
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

      await syncUserDailyActivity(req.user._id, dateStr, {
        steps: record.steps,
        waterIntake: record.waterIntake || 0,
        waterGoal: record.waterGoal || 2000,
        distance: record.distance,
        calories: record.calories,
        activeMinutes: record.activeMinutes,
        goal: record.goal,
        stepGoal: record.goal,
        source: record.source,
      });

      updatedRecords.push(record);
    }

    const finalUser = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      message: `Successfully synchronized ${updatedRecords.length} step record(s)`,
      count: updatedRecords.length,
      records: updatedRecords,
      dailyActivities: finalUser?.dailyActivities || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log or update daily water intake (Glass, Bottle, Custom Amount, or Reset)
// @route   POST /api/steps/water
// @route   PUT /api/steps/water
// @route   POST /api/water
// @access  Private
export const logWaterIntake = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.payload || {};

    const rawWater =
      body.waterIntake ??
      body.water ??
      body.amount ??
      body.intake ??
      body.addedWater ??
      body.water_intake ??
      nested.waterIntake ??
      nested.water ??
      nested.amount ??
      req.query.waterIntake ??
      req.query.water ??
      req.query.amount;

    const action = (body.action || nested.action || (req.path.includes('add') ? 'add' : (req.path.includes('reset') ? 'reset' : 'auto'))).toLowerCase();
    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);

    let parsedWater = 0;
    if (action === 'reset') {
      parsedWater = 0;
    } else if (rawWater !== undefined && !isNaN(parseInt(rawWater, 10))) {
      parsedWater = parseInt(rawWater, 10);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Valid water intake amount in ml is required',
      });
    }

    const user = await User.findById(req.user._id);
    const defaultWaterGoal = body.waterGoal ? parseInt(body.waterGoal, 10) : (user?.waterGoal || 2000);
    const defaultStepGoal = user?.stepGoal || 10000;

    let stepLog = await StepLog.findOne({
      user: req.user._id,
      date: targetDate,
    });

    if (!stepLog) {
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        steps: (targetDate === todayStr && user?.todaySteps) ? user.todaySteps : 0,
        distance: calcDistance((targetDate === todayStr && user?.todaySteps) ? user.todaySteps : 0),
        calories: calcCalories((targetDate === todayStr && user?.todaySteps) ? user.todaySteps : 0),
        activeMinutes: calcActiveMinutes((targetDate === todayStr && user?.todaySteps) ? user.todaySteps : 0),
        goal: defaultStepGoal,
        waterIntake: action === 'add' ? Math.max(0, parsedWater) : Math.max(0, parsedWater),
        waterGoal: defaultWaterGoal,
        source: 'manual',
        logs: [],
      });
    } else {
      let finalWater = stepLog.waterIntake || 0;
      if (action === 'add' || action === 'increment') {
        finalWater += parsedWater;
      } else if (action === 'reset') {
        finalWater = 0;
      } else {
        finalWater = parsedWater;
      }
      stepLog.waterIntake = Math.max(0, finalWater);
      if (body.waterGoal) stepLog.waterGoal = defaultWaterGoal;
    }

    await stepLog.save();

    // Sync to User model & User.dailyActivities array
    const updatedUser = await syncUserDailyActivity(req.user._id, targetDate, {
      steps: stepLog.steps,
      waterIntake: stepLog.waterIntake,
      waterGoal: stepLog.waterGoal,
      distance: stepLog.distance,
      calories: stepLog.calories,
      activeMinutes: stepLog.activeMinutes,
      goal: stepLog.goal,
      stepGoal: stepLog.goal,
      source: stepLog.source,
    });

    const percentage = Math.min(100, Math.round(((stepLog.waterIntake || 0) / (stepLog.waterGoal || 2000)) * 100));

    res.status(200).json({
      success: true,
      message: 'Water intake saved successfully',
      date: targetDate,
      waterIntake: stepLog.waterIntake,
      water_intake: stepLog.waterIntake,
      waterGoal: stepLog.waterGoal,
      percentage,
      isWaterGoalAchieved: stepLog.waterIntake >= stepLog.waterGoal,
      data: {
        date: targetDate,
        waterIntake: stepLog.waterIntake,
        waterGoal: stepLog.waterGoal,
        percentage,
        steps: stepLog.steps,
      },
      dailyActivities: updatedUser?.dailyActivities || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log Blood Pressure (Systolic, Diastolic, Pulse) for a day
// @route   POST /api/steps/bp
// @route   POST /api/scans/bp
// @access  Private
export const logBPReading = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.payload || {};
    
    let systolic = parseInt(body.systolic ?? nested.systolic ?? body.bp?.systolic ?? nested.bp?.systolic ?? req.query.systolic ?? 0, 10);
    let diastolic = parseInt(body.diastolic ?? nested.diastolic ?? body.bp?.diastolic ?? nested.bp?.diastolic ?? req.query.diastolic ?? 0, 10);
    let pulse = parseInt(body.pulse ?? body.pulseHr ?? body.pulseHR ?? body.heartRate ?? nested.pulse ?? nested.pulseHr ?? nested.pulseHR ?? nested.heartRate ?? body.bp?.pulse ?? nested.bp?.pulse ?? req.query.pulse ?? 0, 10);

    if ((!systolic || !diastolic) && (body.bloodPressure || nested.bloodPressure)) {
      const bpStr = String(body.bloodPressure || nested.bloodPressure).trim();
      const parts = bpStr.split('/');
      if (parts.length === 2) {
        if (!systolic) systolic = parseInt(parts[0], 10) || 0;
        if (!diastolic) diastolic = parseInt(parts[1], 10) || 0;
      }
    }

    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);

    let stepLog = await StepLog.findOne({ user: req.user._id, date: targetDate });
    const bpDisplay = (systolic > 0 && diastolic > 0) ? `${systolic}/${diastolic}` : '0/0';

    if (!stepLog) {
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        bp: { systolic, diastolic, pulse, isManualOrScanned: true },
        systolic,
        diastolic,
        pulse,
        bloodPressure: bpDisplay,
      });
    } else {
      stepLog.bp = { systolic, diastolic, pulse, isManualOrScanned: true };
      stepLog.systolic = systolic;
      stepLog.diastolic = diastolic;
      stepLog.pulse = pulse;
      stepLog.bloodPressure = bpDisplay;
    }
    await stepLog.save();

    const updatedUser = await syncUserDailyActivity(req.user._id, targetDate, {
      bp: { systolic, diastolic, pulse },
      systolic,
      diastolic,
      pulse,
      bloodPressure: bpDisplay,
    });

    console.log(`🩺 [BP LOGGED] Date: ${targetDate}, User: ${req.user._id}, BP: ${bpDisplay}, Pulse: ${pulse}`);

    res.status(200).json({
      success: true,
      message: 'Blood Pressure saved successfully',
      date: targetDate,
      bp: { systolic, diastolic, pulse },
      bloodPressure: bpDisplay,
      blood_pressure: bpDisplay,
      systolic,
      diastolic,
      pulse,
      dailyActivities: updatedUser?.dailyActivities || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log Carbs Intake for a day
// @route   POST /api/steps/carbs
// @route   POST /api/scans/plate
// @access  Private
export const logCarbsIntake = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.payload || {};
    const carbs = parseInt(body.carbs ?? body.carbsIntake ?? nested.carbs ?? nested.carbsIntake ?? req.query.carbs ?? 0, 10);
    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);

    let stepLog = await StepLog.findOne({ user: req.user._id, date: targetDate });
    if (!stepLog) {
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        carbs,
        carbsIntake: carbs,
      });
    } else {
      stepLog.carbs = carbs;
      stepLog.carbsIntake = carbs;
    }
    await stepLog.save();

    const updatedUser = await syncUserDailyActivity(req.user._id, targetDate, {
      carbs,
      carbsIntake: carbs,
    });

    res.status(200).json({
      success: true,
      message: 'Carbs intake saved successfully',
      date: targetDate,
      carbs,
      carbsIntake: carbs,
      dailyActivities: updatedUser?.dailyActivities || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log Stress Score (0 to 5) for a day
// @route   POST /api/steps/stress
// @route   POST /api/scans/stress
// @access  Private
export const logStressScore = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.payload || {};
    const stressScore = parseInt(body.stressScore ?? body.stress ?? nested.stressScore ?? nested.stress ?? req.query.stressScore ?? 0, 10);
    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);

    let stepLog = await StepLog.findOne({ user: req.user._id, date: targetDate });
    if (!stepLog) {
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        stressScore,
      });
    } else {
      stepLog.stressScore = stressScore;
    }
    await stepLog.save();

    const updatedUser = await syncUserDailyActivity(req.user._id, targetDate, {
      stressScore,
      stress: stressScore,
    });

    res.status(200).json({
      success: true,
      message: 'Stress score saved successfully',
      date: targetDate,
      stressScore,
      dailyActivities: updatedUser?.dailyActivities || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log Mood & Energy Score (0 to 5) for a day
// @route   POST /api/steps/energy
// @route   POST /api/scans/energy
// @access  Private
export const logMoodEnergy = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.payload || {};
    const moodAndEnergy = parseInt(body.moodAndEnergy ?? body.energyLevel ?? body.energy ?? body.mood ?? nested.moodAndEnergy ?? req.query.energy ?? 0, 10);
    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);

    let stepLog = await StepLog.findOne({ user: req.user._id, date: targetDate });
    if (!stepLog) {
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
        moodAndEnergy,
        energyLevel: moodAndEnergy,
      });
    } else {
      stepLog.moodAndEnergy = moodAndEnergy;
      stepLog.energyLevel = moodAndEnergy;
    }
    await stepLog.save();

    const updatedUser = await syncUserDailyActivity(req.user._id, targetDate, {
      moodAndEnergy,
      energyLevel: moodAndEnergy,
    });

    res.status(200).json({
      success: true,
      message: 'Mood & Energy score saved successfully',
      date: targetDate,
      moodAndEnergy,
      energyLevel: moodAndEnergy,
      dailyActivities: updatedUser?.dailyActivities || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log / Sync all daily biomarkers in one call
// @route   POST /api/steps/biomarkers
// @route   POST /api/scans/sync
// @access  Private
export const logDailyBiomarkers = async (req, res, next) => {
  try {
    const body = req.body || {};
    const nested = body.data || body.payload || {};

    // 1. Handle dailyBreakdown batch sync if provided
    const breakdownItems = Array.isArray(body.dailyBreakdown) ? body.dailyBreakdown : (Array.isArray(nested.dailyBreakdown) ? nested.dailyBreakdown : null);
    if (breakdownItems && breakdownItems.length > 0) {
      let lastUpdatedUser = null;
      for (const item of breakdownItems) {
        if (!item || !item.date) continue;
        const itemDate = item.date;
        const s = parseInt(item.systolic ?? item.bp?.systolic ?? 0, 10);
        const d = parseInt(item.diastolic ?? item.bp?.diastolic ?? 0, 10);
        const p = parseInt(item.pulse ?? item.pulseHr ?? item.pulseHR ?? item.heartRate ?? item.bp?.pulse ?? 0, 10);
        const c = parseInt(item.carbsIntake ?? item.carbs ?? 0, 10);
        const st = parseInt(item.stressScore ?? item.stress ?? 0, 10);
        const en = parseInt(item.moodAndEnergy ?? item.energyLevel ?? item.energy ?? item.mood ?? 0, 10);
        const stp = parseInt(item.steps ?? item.footsteps ?? 0, 10);
        const wt = parseInt(item.waterIntake ?? item.hydration ?? 0, 10);

        let sl = await StepLog.findOne({ user: req.user._id, date: itemDate });
        if (!sl) sl = new StepLog({ user: req.user._id, date: itemDate });
        if (stp > 0) sl.steps = stp;
        if (wt > 0) sl.waterIntake = wt;
        if (s > 0) {
          sl.bp = { systolic: s, diastolic: d, pulse: p, isManualOrScanned: true };
          sl.systolic = s;
          sl.diastolic = d;
          sl.pulse = p;
          sl.bloodPressure = `${s}/${d}`;
        }
        if (c > 0) {
          sl.carbs = c;
          sl.carbsIntake = c;
        }
        if (st > 0) sl.stressScore = st;
        if (en > 0) {
          sl.moodAndEnergy = en;
          sl.energyLevel = en;
        }
        await sl.save();

        lastUpdatedUser = await syncUserDailyActivity(req.user._id, itemDate, {
          steps: stp > 0 ? stp : undefined,
          waterIntake: wt > 0 ? wt : undefined,
          systolic: s > 0 ? s : undefined,
          diastolic: d > 0 ? d : undefined,
          pulse: p > 0 ? p : undefined,
          bp: s > 0 ? { systolic: s, diastolic: d, pulse: p } : undefined,
          bloodPressure: s > 0 ? `${s}/${d}` : undefined,
          carbs: c > 0 ? c : undefined,
          carbsIntake: c > 0 ? c : undefined,
          stressScore: st > 0 ? st : undefined,
          stress: st > 0 ? st : undefined,
          moodAndEnergy: en > 0 ? en : undefined,
          energyLevel: en > 0 ? en : undefined,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Daily breakdown biomarkers saved successfully',
        dailyActivities: lastUpdatedUser?.dailyActivities || [],
      });
    }

    // 2. Single Date Biomarkers Sync
    const todayStr = getTodayDateString(req);
    const targetDate = (body.date || nested.date || req.query.date ? String(body.date || nested.date || req.query.date).trim() : todayStr);

    let systolic = parseInt(body.systolic ?? nested.systolic ?? body.bp?.systolic ?? nested.bp?.systolic ?? req.query.systolic ?? 0, 10);
    let diastolic = parseInt(body.diastolic ?? nested.diastolic ?? body.bp?.diastolic ?? nested.bp?.diastolic ?? req.query.diastolic ?? 0, 10);
    let pulse = parseInt(body.pulse ?? body.pulseHr ?? body.pulseHR ?? body.heartRate ?? nested.pulse ?? nested.pulseHr ?? nested.pulseHR ?? nested.heartRate ?? body.bp?.pulse ?? nested.bp?.pulse ?? req.query.pulse ?? 0, 10);

    if ((!systolic || !diastolic) && (body.bloodPressure || nested.bloodPressure)) {
      const bpParts = String(body.bloodPressure || nested.bloodPressure).trim().split('/');
      if (bpParts.length === 2) {
        if (!systolic) systolic = parseInt(bpParts[0], 10) || 0;
        if (!diastolic) diastolic = parseInt(bpParts[1], 10) || 0;
      }
    }

    const carbs = parseInt(body.carbs ?? body.carbsIntake ?? nested.carbs ?? nested.carbsIntake ?? req.query.carbs ?? 0, 10);
    const stressScore = parseInt(body.stressScore ?? body.stress ?? nested.stressScore ?? nested.stress ?? req.query.stressScore ?? 0, 10);
    const moodAndEnergy = parseInt(body.moodAndEnergy ?? body.energyLevel ?? body.energy ?? body.mood ?? nested.moodAndEnergy ?? nested.energyLevel ?? req.query.energy ?? 0, 10);
    const steps = parseInt(body.steps ?? body.footsteps ?? nested.steps ?? nested.footsteps ?? 0, 10);
    const waterIntake = parseInt(body.waterIntake ?? body.hydration ?? nested.waterIntake ?? nested.hydration ?? 0, 10);

    let stepLog = await StepLog.findOne({ user: req.user._id, date: targetDate });
    if (!stepLog) {
      stepLog = new StepLog({
        user: req.user._id,
        date: targetDate,
      });
    }

    const patchData = {};
    if (steps > 0) {
      stepLog.steps = steps;
      patchData.steps = steps;
    }
    if (waterIntake > 0) {
      stepLog.waterIntake = waterIntake;
      patchData.waterIntake = waterIntake;
    }
    if (systolic > 0 || diastolic > 0) {
      stepLog.bp = {
        systolic,
        diastolic,
        pulse,
        isManualOrScanned: true,
      };
      stepLog.systolic = systolic;
      stepLog.diastolic = diastolic;
      stepLog.pulse = pulse;
      stepLog.bloodPressure = `${systolic}/${diastolic}`;

      patchData.bp = stepLog.bp;
      patchData.systolic = systolic;
      patchData.diastolic = diastolic;
      patchData.pulse = pulse;
      patchData.bloodPressure = stepLog.bloodPressure;
    }
    if (carbs > 0) {
      stepLog.carbs = carbs;
      stepLog.carbsIntake = carbs;
      patchData.carbs = carbs;
      patchData.carbsIntake = carbs;
    }
    if (stressScore > 0) {
      stepLog.stressScore = stressScore;
      patchData.stressScore = stressScore;
      patchData.stress = stressScore;
    }
    if (moodAndEnergy > 0) {
      stepLog.moodAndEnergy = moodAndEnergy;
      stepLog.energyLevel = moodAndEnergy;
      patchData.moodAndEnergy = moodAndEnergy;
      patchData.energyLevel = moodAndEnergy;
      patchData.energy = moodAndEnergy;
      patchData.mood = moodAndEnergy;
    }

    await stepLog.save();
    const updatedUser = await syncUserDailyActivity(req.user._id, targetDate, patchData);

    console.log(`📊 [BIOMARKERS LOGGED] Date: ${targetDate}, User: ${req.user._id}, Patch:`, JSON.stringify(patchData));

    res.status(200).json({
      success: true,
      message: 'Daily biomarkers saved successfully',
      date: targetDate,
      data: {
        date: targetDate,
        bp: stepLog.bp,
        systolic: stepLog.systolic,
        diastolic: stepLog.diastolic,
        pulse: stepLog.pulse,
        bloodPressure: stepLog.bloodPressure,
        carbs: stepLog.carbs,
        carbsIntake: stepLog.carbsIntake,
        stressScore: stepLog.stressScore,
        moodAndEnergy: stepLog.moodAndEnergy,
        energyLevel: stepLog.energyLevel,
      },
      dailyActivities: updatedUser?.dailyActivities || [],
    });
  } catch (error) {
    next(error);
  }
};

