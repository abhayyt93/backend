import User from '../models/User.js';
import StepLog from '../models/StepLog.js';
import GlucoseReading from '../models/GlucoseReading.js';
import UserNotificationPreferences from '../models/UserNotificationPreferences.js';
import AnalysisResult from '../models/AnalysisResult.js';
import { sendToUser } from './fcmService.js';

/**
 * Health Notification & AI Analysis Rule Engine
 * Contains 15+ specialized rule methods, trend calculations, scoring formulas,
 * recommendation generators, and quiet-hours awareness.
 */

// Helper to get formatted IST date string 'YYYY-MM-DD'
export const getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

// Helper to get current IST hour (0 - 23)
export const getISTHour = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : date.getHours();
};

/**
 * Fetch or create default notification preferences for a user
 */
export const getOrCreatePreferences = async (userId) => {
  let prefs = await UserNotificationPreferences.findOne({ user: userId });
  if (!prefs) {
    prefs = await UserNotificationPreferences.create({
      user: userId,
      categories: {
        hydration: { enabled: true, frequency: '2h', frequencyHours: 2 },
        waterGoals: { enabled: true, frequency: 'daily', reminderHour: 19 },
        waterIntake: { enabled: true, frequency: '2h', frequencyHours: 2 },
        inactivity: { enabled: true, frequency: '90m', idleThresholdMinutes: 90 },
        stepGoals: { enabled: true, frequency: 'daily', reminderHour: 20 },
        stepCount: { enabled: true, frequency: 'daily', reminderHour: 20 },
        glucoseAlerts: { enabled: true, frequency: 'instant', highThreshold: 180, lowThreshold: 70 },
        bpAlerts: { enabled: true, frequency: 'instant', frequencyHours: 0, systolicHigh: 140, diastolicHigh: 90 },
        bloodPressure: { enabled: true, frequency: 'instant', frequencyHours: 0 },
        plateScan: { enabled: true, frequency: 'instant', frequencyHours: 0 },
        promotions: { enabled: true, frequency: 'daily', frequencyHours: 24 },
        promos: { enabled: true, frequency: 'daily', frequencyHours: 24 },
        orderUpdates: { enabled: true, frequency: 'instant', frequencyHours: 0 },
        dailySummary: { enabled: true, frequency: 'daily', summaryHour: 21 },
        morningMotivation: { enabled: true, frequency: 'daily', sendHour: 8 },
        medication: { enabled: true, frequency: 'daily' },
        weeklyReport: { enabled: true, frequency: 'weekly', dayOfWeek: 0 },
        healthTips: { enabled: true, frequency: 'daily' },
      },
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00',
        timezone: 'Asia/Kolkata',
      },
    });
  }
  return prefs;
};

/**
 * Rate limit check: Ensures we don't spam notifications within frequency limits.
 * Supports Instant (Real-time), 30m, 1h, 2h, daily, weekly frequencies.
 */
const shouldSendNotification = (prefs, categoryKey, minIntervalMinutes = 60) => {
  if (!prefs) return true;

  // Resolve category configuration (handle direct name or alias)
  const catConfig =
    prefs.categories?.[categoryKey] ||
    (categoryKey === 'hydration' && prefs.categories?.waterIntake) ||
    (categoryKey === 'waterGoal' && prefs.categories?.waterGoals) ||
    (categoryKey === 'inactivity' && prefs.categories?.stepCount) ||
    (categoryKey === 'stepGoal' && prefs.categories?.stepGoals) ||
    (categoryKey === 'bpAlert' && prefs.categories?.bpAlerts) ||
    (categoryKey === 'promotions' && prefs.categories?.promos);

  // Check if frequency is Instant (Real-time) or 0 hours
  if (
    catConfig?.frequency === 'instant' ||
    catConfig?.frequency === 'realtime' ||
    catConfig?.frequencyHours === 0
  ) {
    return true; // Deliver immediately in real-time!
  }

  // Calculate dynamic cooldown interval from frequency setting
  if (catConfig?.frequency) {
    if (catConfig.frequency === '30m') minIntervalMinutes = 30;
    else if (catConfig.frequency === '1h') minIntervalMinutes = 60;
    else if (catConfig.frequency === '2h') minIntervalMinutes = 120;
    else if (catConfig.frequency === 'daily') minIntervalMinutes = 1440;
    else if (catConfig.frequency === 'weekly') minIntervalMinutes = 10080;
  } else if (typeof catConfig?.frequencyHours === 'number' && catConfig.frequencyHours > 0) {
    minIntervalMinutes = catConfig.frequencyHours * 60;
  }

  if (prefs.isInQuietHours && prefs.isInQuietHours()) {
    // Critical health alerts and order updates bypass quiet hours
    if (
      categoryKey !== 'glucoseAlert' &&
      categoryKey !== 'bpAlert' &&
      categoryKey !== 'orderUpdates'
    ) {
      return false;
    }
  }

  const lastSent = prefs.lastSentTimestamps?.[categoryKey];
  if (!lastSent) return true;

  const diffMinutes = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60);
  return diffMinutes >= minIntervalMinutes;
};

/**
 * Update the lastSent timestamp for a category
 */
const markCategorySent = async (prefs, categoryKey) => {
  if (!prefs) return;
  if (!prefs.lastSentTimestamps) prefs.lastSentTimestamps = {};
  prefs.lastSentTimestamps[categoryKey] = new Date();
  await prefs.save();
};

// ==========================================
// 15+ RULE METHODS & HEALTH ANALYSIS PIPELINE
// ==========================================

/**
 * 1. Check Hydration Alert
 */
export const checkHydrationAlert = async (user, prefs, todayLog) => {
  if (!prefs.categories.hydration.enabled) return null;
  const intervalMins = (prefs.categories.hydration.frequencyHours || 2) * 60;
  if (!shouldSendNotification(prefs, 'hydration', intervalMins)) return null;

  const currentHour = getISTHour();
  if (currentHour < 8 || currentHour > 21) return null; // Only daytime

  const currentWater = todayLog?.waterIntake || user.todayWater || 0;
  const goalWater = todayLog?.waterGoal || user.waterGoal || 2000;

  // Expected water by this time of day (pro-rated between 8am and 9pm = 13 active hours)
  const activeHoursElapsed = Math.max(1, currentHour - 8);
  const targetSoFar = Math.round((goalWater / 13) * activeHoursElapsed);

  if (currentWater < targetSoFar) {
    const glassesBehind = Math.max(1, Math.round((targetSoFar - currentWater) / 250));
    const title = '💧 Hydration Check';
    const body = `You are about ${glassesBehind} glass(es) behind your target. Drink a glass of water now to stay energized! (${currentWater}/${goalWater} ml)`;

    await sendToUser({
      userId: user,
      title,
      body,
      category: 'hydration',
      type: 'REMINDER',
      data: { currentWater, goalWater, glassesBehind },
    });

    await markCategorySent(prefs, 'hydration');
    return { triggered: true, title, body };
  }

  return null;
};

/**
 * 2. Check Inactivity Alert
 */
export const checkInactivityAlert = async (user, prefs, todayLog) => {
  if (!prefs.categories.inactivity.enabled) return null;
  const thresholdMins = prefs.categories.inactivity.idleThresholdMinutes || 90;
  if (!shouldSendNotification(prefs, 'inactivity', thresholdMins)) return null;

  const currentHour = getISTHour();
  if (currentHour < 10 || currentHour > 20) return null; // Active daytime only

  const steps = todayLog?.steps || user.todaySteps || 0;

  // If steps are low compared to expected mid-day steps
  const expectedStepsNow = Math.round(((user.stepGoal || 10000) / 12) * Math.max(1, currentHour - 9));
  if (steps < expectedStepsNow * 0.4) {
    const title = '🚶 Time to Stretch & Move!';
    const body = `You have been sitting for a while. Take a quick 5-minute stroll to boost circulation and metabolism.`;

    await sendToUser({
      userId: user,
      title,
      body,
      category: 'inactivity',
      type: 'REMINDER',
      data: { currentSteps: steps, expectedSteps: expectedStepsNow },
    });

    await markCategorySent(prefs, 'inactivity');
    return { triggered: true, title, body };
  }

  return null;
};

/**
 * 3. Check Glucose Alerts (Hyperglycemia / Hypoglycemia)
 */
export const checkGlucoseAlerts = async (user, prefs) => {
  if (!prefs.categories.glucoseAlerts.enabled) return null;

  const highCutoff = prefs.categories.glucoseAlerts.highThreshold || 180;
  const lowCutoff = prefs.categories.glucoseAlerts.lowThreshold || 70;

  // Get most recent reading in the last 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const latest = await GlucoseReading.findOne({
    user: user._id,
    readingTime: { $gte: fourHoursAgo },
  }).sort({ readingTime: -1 });

  if (!latest) return null;

  if (latest.glucoseLevel < lowCutoff) {
    // Hypoglycemia - Urgent alert (ignores quiet hours)
    if (!shouldSendNotification(prefs, 'glucoseAlert', 30)) return null;

    const title = '⚠️ Hypoglycemia Warning';
    const body = `Your glucose reading of ${latest.glucoseLevel} mg/dL is low. Please consume 15g fast-acting carbs (juice or glucose tablet) immediately.`;

    await sendToUser({
      userId: user,
      title,
      body,
      category: 'glucose',
      type: 'ALERT',
      data: { glucoseLevel: latest.glucoseLevel, readingType: latest.readingType },
    });

    await markCategorySent(prefs, 'glucoseAlert');
    return { triggered: true, severity: 'critical', title, body };
  } else if (latest.glucoseLevel > highCutoff) {
    // Hyperglycemia
    if (!shouldSendNotification(prefs, 'glucoseAlert', 90)) return null;

    const title = '📈 High Glucose Spike Alert';
    const body = `Glucose reading of ${latest.glucoseLevel} mg/dL recorded. Stay well-hydrated, take a light walk, and review post-meal carbs.`;

    await sendToUser({
      userId: user,
      title,
      body,
      category: 'glucose',
      type: 'ALERT',
      data: { glucoseLevel: latest.glucoseLevel, readingType: latest.readingType },
    });

    await markCategorySent(prefs, 'glucoseAlert');
    return { triggered: true, severity: 'high', title, body };
  }

  return null;
};

/**
 * 4. Check Blood Pressure Alerts
 */
export const checkBloodPressureAlerts = async (user, prefs, todayLog) => {
  if (!prefs.categories.bpAlerts.enabled) return null;
  if (!shouldSendNotification(prefs, 'bpAlert', 120)) return null;

  const systolic = todayLog?.systolic || todayLog?.bp?.systolic || 0;
  const diastolic = todayLog?.diastolic || todayLog?.bp?.diastolic || 0;

  if (systolic === 0 && diastolic === 0) return null;

  const systolicHigh = prefs.categories.bpAlerts.systolicHigh || 140;
  const diastolicHigh = prefs.categories.bpAlerts.diastolicHigh || 90;

  if (systolic >= systolicHigh || diastolic >= diastolicHigh) {
    const title = '🩺 Elevated Blood Pressure Alert';
    const body = `Latest BP is ${systolic}/${diastolic} mmHg. Take slow deep breaths, sit in a calm posture, and avoid salt or caffeine.`;

    await sendToUser({
      userId: user,
      title,
      body,
      category: 'bp',
      type: 'ALERT',
      data: { systolic, diastolic },
    });

    await markCategorySent(prefs, 'bpAlert');
    return { triggered: true, title, body };
  } else if (systolic > 0 && systolic < 90) {
    const title = '🩺 Low Blood Pressure Alert';
    const body = `Latest BP is ${systolic}/${diastolic} mmHg. Stay seated, drink water with electrolytes, and rest.`;

    await sendToUser({
      userId: user,
      title,
      body,
      category: 'bp',
      type: 'ALERT',
      data: { systolic, diastolic },
    });

    await markCategorySent(prefs, 'bpAlert');
    return { triggered: true, title, body };
  }

  return null;
};

/**
 * 5. Check Step Goal Progress (Evening check)
 */
export const checkStepGoalProgress = async (user, prefs, todayLog) => {
  if (!prefs.categories.stepGoals.enabled) return null;
  if (!shouldSendNotification(prefs, 'stepGoal', 240)) return null;

  const steps = todayLog?.steps || user.todaySteps || 0;
  const goal = todayLog?.goal || user.stepGoal || 10000;
  const percent = Math.round((steps / goal) * 100);

  let title = '';
  let body = '';

  if (percent >= 100) {
    title = '🎉 Daily Step Goal Crushed!';
    body = `Phenomenal work! You reached ${steps.toLocaleString()} steps today (${percent}% of goal). Keep the momentum alive!`;
  } else if (percent >= 75) {
    const remaining = goal - steps;
    title = '🔥 Almost at the Finish Line!';
    body = `You are at ${steps.toLocaleString()} steps (${percent}%). Just ${remaining.toLocaleString()} steps left to smash your goal tonight!`;
  } else {
    title = '👟 Evening Step Boost';
    body = `You are at ${steps.toLocaleString()} steps today. A 15-minute post-dinner walk will help digest food and get you closer to your goal!`;
  }

  await sendToUser({
    userId: user,
    title,
    body,
    category: 'step_goal',
    type: percent >= 100 ? 'ACHIEVEMENT' : 'MOTIVATION',
    data: { steps, goal, percent },
  });

  await markCategorySent(prefs, 'stepGoal');
  return { triggered: true, title, body, percent };
};

/**
 * 6. Check Water Goal Progress (Evening check)
 */
export const checkWaterGoalProgress = async (user, prefs, todayLog) => {
  if (!prefs.categories.waterGoals.enabled) return null;
  if (!shouldSendNotification(prefs, 'waterGoal', 240)) return null;

  const water = todayLog?.waterIntake || user.todayWater || 0;
  const goal = todayLog?.waterGoal || user.waterGoal || 2000;
  const percent = Math.round((water / goal) * 100);

  let title = '';
  let body = '';

  if (percent >= 100) {
    title = '🌊 Hydration Goal Achieved!';
    body = `Great job staying hydrated today with ${water} ml! Your cells and metabolism thank you.`;
  } else {
    const remaining = goal - water;
    title = '💧 Evening Hydration Reminder';
    body = `You have drunk ${water} ml out of your ${goal} ml goal (${remaining} ml left). Have a glass before settling in for the night.`;
  }

  await sendToUser({
    userId: user,
    title,
    body,
    category: 'water_goal',
    type: percent >= 100 ? 'ACHIEVEMENT' : 'REMINDER',
    data: { water, goal, percent },
  });

  await markCategorySent(prefs, 'waterGoal');
  return { triggered: true, title, body };
};

/**
 * 7. Generate Daily Summary & AI Scores (Night check)
 */
export const generateDailySummary = async (user, prefs, todayLog) => {
  if (!prefs.categories.dailySummary.enabled) return null;
  if (!shouldSendNotification(prefs, 'dailySummary', 360)) return null;

  const dateStr = todayLog?.date || getISTDateString();
  const steps = todayLog?.steps || user.todaySteps || 0;
  const water = todayLog?.waterIntake || user.todayWater || 0;
  const calories = todayLog?.calories || 0;
  const distance = todayLog?.distance || 0;

  // Run full health scoring
  const scores = calculateHealthScores(todayLog);

  const title = `📊 Daily Health Summary (${dateStr})`;
  const body = `Today's Health Score: ${scores.healthScore}/100. Steps: ${steps.toLocaleString()} | Water: ${water} ml | Calories: ${calories} kcal. Sleep well tonight!`;

  await sendToUser({
    userId: user,
    title,
    body,
    category: 'daily_summary',
    type: 'REPORT',
    data: { scores, steps, water, calories, distance, date: dateStr },
  });

  await markCategorySent(prefs, 'dailySummary');
  return { triggered: true, scores, title, body };
};

/**
 * 8. Generate Morning Motivation & Targets
 */
export const generateMorningMotivation = async (user, prefs, pastWeekActivities = []) => {
  if (!prefs.categories.morningMotivation.enabled) return null;
  if (!shouldSendNotification(prefs, 'morningMotivation', 360)) return null;

  const stepGoal = user.stepGoal || 10000;
  const waterGoal = user.waterGoal || 2000;

  const motivations = [
    `Rise and shine, ${user.name || 'there'}! Today is a clean slate. Aim for ${stepGoal.toLocaleString()} steps and staying hydrated.`,
    `Good morning! Small daily actions compound into lifelong vitality. Let's make today count!`,
    `A fresh morning to reset and recharge! Start your day with a warm glass of water and morning movement.`,
  ];

  const picked = motivations[Math.floor(Math.random() * motivations.length)];
  const title = '☀️ Good Morning, Kosmico Champion!';

  await sendToUser({
    userId: user,
    title,
    body: picked,
    category: 'morning_motivation',
    type: 'MOTIVATION',
    data: { stepGoal, waterGoal },
  });

  await markCategorySent(prefs, 'morningMotivation');
  return { triggered: true, title, body: picked };
};

/**
 * 9. Check Medication / Supplement Reminder
 */
export const checkMedicationReminder = async (user, prefs) => {
  if (!prefs.categories.medication.enabled) return null;
  if (!shouldSendNotification(prefs, 'medication', 360)) return null;

  const title = '💊 Wellness & Supplement Reminder';
  const body = `Time for your scheduled vitamins, supplements, or medications. Consistency is key to long-term health.`;

  await sendToUser({
    userId: user,
    title,
    body,
    category: 'medication',
    type: 'REMINDER',
  });

  await markCategorySent(prefs, 'medication');
  return { triggered: true, title, body };
};

/**
 * 10. Generate Weekly Health Report
 */
export const generateWeeklyHealthReport = async (user, prefs, past7DaysLogs = []) => {
  if (!prefs.categories.weeklyReport.enabled) return null;
  if (!shouldSendNotification(prefs, 'weeklyReport', 24 * 60 * 5)) return null; // once every 5 days min

  let totalSteps = 0;
  let totalWater = 0;
  let totalCalories = 0;
  let activeDays = 0;

  past7DaysLogs.forEach((log) => {
    totalSteps += log.steps || 0;
    totalWater += log.waterIntake || 0;
    totalCalories += log.calories || 0;
    if ((log.steps || 0) >= 3000) activeDays++;
  });

  const avgSteps = past7DaysLogs.length ? Math.round(totalSteps / past7DaysLogs.length) : 0;
  const title = '📈 Your Weekly Wellness Review';
  const body = `You logged ${totalSteps.toLocaleString()} total steps this week (avg ${avgSteps.toLocaleString()}/day) across ${activeDays} active days. Tap to see insights!`;

  await sendToUser({
    userId: user,
    title,
    body,
    category: 'weekly_report',
    type: 'REPORT',
    data: { totalSteps, avgSteps, totalWater, totalCalories, activeDays },
  });

  await markCategorySent(prefs, 'weeklyReport');
  return { triggered: true, title, body, stats: { totalSteps, avgSteps, activeDays } };
};

/**
 * 11. Generate Health Tips
 */
export const generateHealthTips = async (user, prefs, healthTrends = {}) => {
  if (!prefs.categories.healthTips.enabled) return null;
  if (!shouldSendNotification(prefs, 'healthTips', 240)) return null;

  const tips = [
    { title: '🥗 Smart Nutrition Tip', body: 'Eat vegetables and protein first, then carbs. This reduces glucose spikes by up to 30%!' },
    { title: '🚶 Post-Meal Walk', body: 'A quick 10-minute walk after lunch lowers post-prandial blood sugar and prevents afternoon sluggishness.' },
    { title: '💤 Sleep Quality Secret', body: 'Avoid heavy meals and blue screens 1 hour before bedtime to promote deeper restorative delta-wave sleep.' },
    { title: '🧘 Stress Buster Tip', body: 'Try the 4-7-8 breathing method: Inhale for 4s, hold for 7s, exhale for 8s to calm the nervous system.' },
  ];

  const tip = tips[Math.floor(Math.random() * tips.length)];

  await sendToUser({
    userId: user,
    title: tip.title,
    body: tip.body,
    category: 'health_tip',
    type: 'TIP',
  });

  await markCategorySent(prefs, 'healthTips');
  return { triggered: true, title: tip.title, body: tip.body };
};

/**
 * 12. Calculate Health Scores (Activity, Hydration, Vital, Consistency, Overall)
 */
export const calculateHealthScores = (todayLog, pastLogs = [], glucoseReadings = []) => {
  const steps = todayLog?.steps || 0;
  const goal = todayLog?.goal || 10000;
  const water = todayLog?.waterIntake || 0;
  const waterGoal = todayLog?.waterGoal || 2000;

  // Activity score (0 - 100)
  const stepRatio = Math.min(steps / Math.max(goal, 1), 1.25);
  const activityScore = Math.min(100, Math.round(stepRatio * 80 + (todayLog?.activeMinutes ? Math.min(20, todayLog.activeMinutes * 0.5) : 0)));

  // Hydration score (0 - 100)
  const hydrationRatio = Math.min(water / Math.max(waterGoal, 1), 1.0);
  const hydrationScore = Math.min(100, Math.round(hydrationRatio * 100));

  // Vital score (0 - 100) based on BP and Glucose
  let vitalScore = 85; // baseline good score
  const systolic = todayLog?.systolic || todayLog?.bp?.systolic || 0;
  const diastolic = todayLog?.diastolic || todayLog?.bp?.diastolic || 0;

  if (systolic > 0 && diastolic > 0) {
    if (systolic >= 140 || diastolic >= 90) vitalScore -= 25;
    else if (systolic >= 130 || diastolic >= 85) vitalScore -= 10;
    else if (systolic <= 90 || diastolic <= 60) vitalScore -= 15;
    else vitalScore += 10; // optimal
  }

  if (glucoseReadings.length > 0) {
    const latest = glucoseReadings[0].glucoseLevel;
    if (latest > 180 || latest < 70) vitalScore -= 20;
    else if (latest >= 80 && latest <= 130) vitalScore += 5;
  }
  vitalScore = Math.max(20, Math.min(100, vitalScore));

  // Consistency score based on last 7 logs
  let activeCount = 0;
  pastLogs.slice(0, 7).forEach((l) => {
    if ((l.steps || 0) >= 4000) activeCount++;
  });
  const consistencyScore = pastLogs.length ? Math.round((activeCount / Math.min(7, pastLogs.length)) * 100) : 75;

  // Overall Health Score (Weighted average)
  const healthScore = Math.round(
    activityScore * 0.35 +
    hydrationScore * 0.25 +
    vitalScore * 0.25 +
    consistencyScore * 0.15
  );

  return {
    healthScore: Math.min(100, Math.max(10, healthScore)),
    activityScore,
    hydrationScore,
    vitalScore,
    consistencyScore,
  };
};

/**
 * 13. Calculate Activity Trend
 */
export const calculateActivityTrend = (pastLogs = []) => {
  if (pastLogs.length < 3) return 'insufficient_data';
  const recent = pastLogs.slice(0, 3).reduce((acc, l) => acc + (l.steps || 0), 0) / 3;
  const older = pastLogs.slice(3, 7).reduce((acc, l) => acc + (l.steps || 0), 0) / Math.max(1, pastLogs.slice(3, 7).length);

  if (recent > older * 1.15) return 'improving';
  if (recent < older * 0.85) return 'declining';
  return 'steady';
};

/**
 * 14. Calculate Glucose Trend
 */
export const calculateGlucoseTrend = (glucoseReadings = []) => {
  if (glucoseReadings.length < 3) return 'insufficient_data';
  const levels = glucoseReadings.slice(0, 5).map((r) => r.glucoseLevel);
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  const variance = levels.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / levels.length;

  if (variance > 400) return 'fluctuating';
  if (avg > 160) return 'consistently_high';
  if (avg < 75) return 'consistently_low';
  return 'stable';
};

/**
 * 15. Calculate Blood Pressure Trend
 */
export const calculateBPTrend = (pastLogs = []) => {
  const bpLogs = pastLogs.filter((l) => (l.systolic || l.bp?.systolic) > 0);
  if (bpLogs.length < 2) return 'insufficient_data';

  const avgSys = bpLogs.reduce((acc, l) => acc + (l.systolic || l.bp?.systolic || 0), 0) / bpLogs.length;
  const avgDia = bpLogs.reduce((acc, l) => acc + (l.diastolic || l.bp?.diastolic || 0), 0) / bpLogs.length;

  if (avgSys >= 140 || avgDia >= 90) return 'hypertensive';
  if (avgSys >= 130 || avgDia >= 85) return 'elevated';
  if (avgSys < 90 || avgDia < 60) return 'hypotensive';
  return 'optimal';
};

/**
 * 16. Generate Personalized Recommendations & Insights
 */
export const generatePersonalizedRecommendations = (scores, trends, rawMetrics) => {
  const recommendations = [];
  const insights = [];

  // Activity
  if (scores.activityScore < 60) {
    recommendations.push({
      category: 'exercise',
      title: 'Gradual Step Ramp Up',
      action: 'Add a 15-minute brisk walk in the morning and evening to reach at least 6,000 steps daily.',
      priority: 'high',
    });
    insights.push({
      type: 'WARNING',
      title: 'Low Activity Detected',
      description: 'Your physical activity is below target. Regular walking improves cardiovascular strength.',
      severity: 'medium',
      metric: 'activityScore',
      value: scores.activityScore,
    });
  } else {
    insights.push({
      type: 'ACHIEVEMENT',
      title: 'Strong Movement Habit',
      description: 'You are consistently hitting daily step counts. Great cardiovascular stamina!',
      severity: 'info',
      metric: 'activityScore',
      value: scores.activityScore,
    });
  }

  // Hydration
  if (scores.hydrationScore < 70) {
    recommendations.push({
      category: 'hydration',
      title: 'Set Hourly Water Cues',
      action: 'Keep a 1-liter reusable bottle by your desk and aim to refill it twice each day.',
      priority: 'medium',
    });
  }

  // Glucose Trend
  if (trends.glucose === 'consistently_high' || trends.glucose === 'fluctuating') {
    recommendations.push({
      category: 'nutrition',
      title: 'Low Glycemic Index Focus',
      action: 'Pair complex carbs with fiber and healthy fats to slow glucose absorption.',
      priority: 'high',
    });
    insights.push({
      type: 'WARNING',
      title: 'Glucose Fluctuations Noticed',
      description: 'Recent glucose readings show volatility. Monitor post-meal spikes closely.',
      severity: 'high',
      metric: 'glucoseTrend',
      value: trends.glucose,
    });
  }

  // Vital BP Trend
  if (trends.bp === 'elevated' || trends.bp === 'hypertensive') {
    recommendations.push({
      category: 'medical',
      title: 'Cardio Monitoring & Sodium Reduction',
      action: 'Reduce processed salt, integrate 10 minutes of deep meditation, and consult a doctor if BP stays high.',
      priority: 'high',
    });
  }

  // General lifestyle baseline
  if (recommendations.length < 2) {
    recommendations.push({
      category: 'sleep',
      title: 'Maintain 7-8 Hours Rest',
      action: 'Synchronize your circadian rhythm with consistent sleep and wake-up times.',
      priority: 'low',
    });
  }

  return { recommendations, insights };
};

/**
 * 17. Master Analysis Pipeline for a Specific User
 * Can be triggered via API or by automated schedulers.
 */
export const runFullAnalysisForUser = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found' };

    const todayStr = getISTDateString();

    // 1. Fetch today's StepLog
    let todayLog = await StepLog.findOne({ user: user._id, date: todayStr });
    if (!todayLog) {
      todayLog = {
        user: user._id,
        date: todayStr,
        steps: user.todaySteps || 0,
        goal: user.stepGoal || 10000,
        waterIntake: user.todayWater || 0,
        waterGoal: user.waterGoal || 2000,
        calories: 0,
        distance: 0,
        activeMinutes: 0,
        systolic: 0,
        diastolic: 0,
      };
    }

    // 2. Fetch past 14 days StepLogs
    const pastLogs = await StepLog.find({ user: user._id }).sort({ date: -1 }).limit(14);

    // 3. Fetch past 14 days Glucose Readings
    const glucoseReadings = await GlucoseReading.find({ user: user._id }).sort({ readingTime: -1 }).limit(10);

    // 4. Calculate Scores
    const scores = calculateHealthScores(todayLog, pastLogs, glucoseReadings);

    // 5. Calculate Trends
    const trends = {
      activity: calculateActivityTrend(pastLogs),
      glucose: calculateGlucoseTrend(glucoseReadings),
      bp: calculateBPTrend(pastLogs),
    };

    // 6. Generate Recommendations & Insights
    const rawMetrics = {
      todaySteps: todayLog.steps || 0,
      todayWater: todayLog.waterIntake || 0,
      todayCalories: todayLog.calories || 0,
      latestGlucose: glucoseReadings[0]?.glucoseLevel || null,
      latestBP: `${todayLog.systolic || 0}/${todayLog.diastolic || 0}`,
    };

    const { recommendations, insights } = generatePersonalizedRecommendations(scores, trends, rawMetrics);

    // 7. Save AnalysisResult to MongoDB
    const analysisDoc = await AnalysisResult.create({
      user: user._id,
      date: todayStr,
      analysisType: 'overall',
      scores,
      insights,
      recommendations,
      trends,
      rawMetrics,
      triggeredAt: new Date(),
    });

    return {
      success: true,
      analysis: analysisDoc,
    };
  } catch (error) {
    console.error(`❌ [RuleEngine runFullAnalysisForUser Error]:`, error);
    return { success: false, error: error.message };
  }
};

export default {
  getOrCreatePreferences,
  checkHydrationAlert,
  checkInactivityAlert,
  checkGlucoseAlerts,
  checkBloodPressureAlerts,
  checkStepGoalProgress,
  checkWaterGoalProgress,
  generateDailySummary,
  generateMorningMotivation,
  checkMedicationReminder,
  generateWeeklyHealthReport,
  generateHealthTips,
  calculateHealthScores,
  calculateActivityTrend,
  calculateGlucoseTrend,
  calculateBPTrend,
  generatePersonalizedRecommendations,
  runFullAnalysisForUser,
};
