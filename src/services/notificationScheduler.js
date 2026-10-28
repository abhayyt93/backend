import cron from 'node-cron';
import User from '../models/User.js';
import StepLog from '../models/StepLog.js';
import {
  getISTDateString,
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
  runFullAnalysisForUser,
} from './notificationRuleEngine.js';

let isSchedulerRunning = false;
const activeJobs = [];

/**
 * Fetch batch of active users who have valid accounts and aren't blocked
 */
const getEligibleUsers = async () => {
  return await User.find({ isBlocked: { $ne: true } })
    .select('_id name fcmToken fcmPlatform todaySteps todayWater stepGoal waterGoal');
};

/**
 * 1. Hourly Routine: Hydration & Inactivity checks (9:00 AM to 9:00 PM IST)
 */
export const runHourlyHealthChecks = async () => {
  console.log('⏰ [Cron] Running Hourly Hydration & Inactivity checks...');
  try {
    const users = await getEligibleUsers();
    const todayStr = getISTDateString();

    for (const user of users) {
      try {
        const prefs = await getOrCreatePreferences(user._id);
        const todayLog = await StepLog.findOne({ user: user._id, date: todayStr });

        // Hydration check
        await checkHydrationAlert(user, prefs, todayLog);

        // Inactivity check
        await checkInactivityAlert(user, prefs, todayLog);
      } catch (err) {
        console.error(`Error in hourly check for user ${user._id}:`, err.message);
      }
    }
    console.log(`✅ [Cron] Hourly checks completed for ${users.length} users.`);
  } catch (error) {
    console.error('❌ [Cron Error runHourlyHealthChecks]:', error);
  }
};

/**
 * 2. 4-Hourly Routine: Glucose & Blood Pressure Alerts (8 AM, 12 PM, 4 PM, 8 PM IST)
 */
export const runFourHourlyVitalsChecks = async () => {
  console.log('⏰ [Cron] Running 4-Hourly Glucose & Blood Pressure checks...');
  try {
    const users = await getEligibleUsers();
    const todayStr = getISTDateString();

    for (const user of users) {
      try {
        const prefs = await getOrCreatePreferences(user._id);
        const todayLog = await StepLog.findOne({ user: user._id, date: todayStr });

        await checkGlucoseAlerts(user, prefs);
        await checkBloodPressureAlerts(user, prefs, todayLog);
      } catch (err) {
        console.error(`Error in vitals check for user ${user._id}:`, err.message);
      }
    }
    console.log(`✅ [Cron] 4-Hourly vitals checks completed.`);
  } catch (error) {
    console.error('❌ [Cron Error runFourHourlyVitalsChecks]:', error);
  }
};

/**
 * 3. Morning Motivation & Medication Reminder (8:00 AM IST)
 */
export const runMorningRoutine = async () => {
  console.log('☀️ [Cron] Running Morning Routine (Motivation & Medication)...');
  try {
    const users = await getEligibleUsers();

    for (const user of users) {
      try {
        const prefs = await getOrCreatePreferences(user._id);
        await generateMorningMotivation(user, prefs);
        await checkMedicationReminder(user, prefs);
      } catch (err) {
        console.error(`Error in morning routine for user ${user._id}:`, err.message);
      }
    }
    console.log(`✅ [Cron] Morning routine completed for ${users.length} users.`);
  } catch (error) {
    console.error('❌ [Cron Error runMorningRoutine]:', error);
  }
};

/**
 * 4. Evening Goals Routine (8:00 PM IST)
 */
export const runEveningGoalsRoutine = async () => {
  console.log('👟 [Cron] Running Evening Goals Routine (Steps & Water Progress)...');
  try {
    const users = await getEligibleUsers();
    const todayStr = getISTDateString();

    for (const user of users) {
      try {
        const prefs = await getOrCreatePreferences(user._id);
        const todayLog = await StepLog.findOne({ user: user._id, date: todayStr });

        await checkStepGoalProgress(user, prefs, todayLog);
        await checkWaterGoalProgress(user, prefs, todayLog);
      } catch (err) {
        console.error(`Error in evening routine for user ${user._id}:`, err.message);
      }
    }
    console.log(`✅ [Cron] Evening routine completed.`);
  } catch (error) {
    console.error('❌ [Cron Error runEveningGoalsRoutine]:', error);
  }
};

/**
 * 5. Night Daily Summary & AI Health Scoring (9:30 PM IST)
 */
export const runNightDailySummary = async () => {
  console.log('📊 [Cron] Running Night Daily Summary & Health Score calculation...');
  try {
    const users = await getEligibleUsers();
    const todayStr = getISTDateString();

    for (const user of users) {
      try {
        const prefs = await getOrCreatePreferences(user._id);
        const todayLog = await StepLog.findOne({ user: user._id, date: todayStr });

        await generateDailySummary(user, prefs, todayLog);
        await runFullAnalysisForUser(user._id);
      } catch (err) {
        console.error(`Error in daily summary for user ${user._id}:`, err.message);
      }
    }
    console.log(`✅ [Cron] Night summary completed.`);
  } catch (error) {
    console.error('❌ [Cron Error runNightDailySummary]:', error);
  }
};

/**
 * 6. Weekly Report & Health Tips (Every Sunday at 10:00 AM IST)
 */
export const runWeeklyReportRoutine = async () => {
  console.log('📅 [Cron] Running Weekly Health Report & Tips...');
  try {
    const users = await getEligibleUsers();

    for (const user of users) {
      try {
        const prefs = await getOrCreatePreferences(user._id);
        const past7Logs = await StepLog.find({ user: user._id }).sort({ date: -1 }).limit(7);

        await generateWeeklyHealthReport(user, prefs, past7Logs);
        await generateHealthTips(user, prefs);
      } catch (err) {
        console.error(`Error in weekly report for user ${user._id}:`, err.message);
      }
    }
    console.log(`✅ [Cron] Weekly report completed.`);
  } catch (error) {
    console.error('❌ [Cron Error runWeeklyReportRoutine]:', error);
  }
};

/**
 * Initialize all Cron Job schedules
 */
export const initNotificationScheduler = () => {
  if (isSchedulerRunning) {
    console.log('⚠️ [Cron] Notification scheduler already running.');
    return;
  }

  const istOptions = { timezone: 'Asia/Kolkata' };

  // 1. Hourly check from 9:00 AM to 9:00 PM IST at minute 0
  const hourlyJob = cron.schedule(
    '0 9-21 * * *',
    async () => {
      await runHourlyHealthChecks();
    },
    istOptions
  );
  activeJobs.push({ name: 'Hourly Checks', job: hourlyJob });

  // 2. 4-Hourly vitals check at 8:00, 12:00, 16:00, 20:00 IST
  const vitalsJob = cron.schedule(
    '0 8,12,16,20 * * *',
    async () => {
      await runFourHourlyVitalsChecks();
    },
    istOptions
  );
  activeJobs.push({ name: '4-Hourly Vitals', job: vitalsJob });

  // 3. Morning Motivation at 8:00 AM IST
  const morningJob = cron.schedule(
    '0 8 * * *',
    async () => {
      await runMorningRoutine();
    },
    istOptions
  );
  activeJobs.push({ name: 'Morning Routine', job: morningJob });

  // 4. Evening Goals at 8:00 PM IST (20:00)
  const eveningJob = cron.schedule(
    '0 20 * * *',
    async () => {
      await runEveningGoalsRoutine();
    },
    istOptions
  );
  activeJobs.push({ name: 'Evening Goals', job: eveningJob });

  // 5. Daily Summary & AI Scores at 9:30 PM IST (21:30)
  const summaryJob = cron.schedule(
    '30 21 * * *',
    async () => {
      await runNightDailySummary();
    },
    istOptions
  );
  activeJobs.push({ name: 'Daily Summary', job: summaryJob });

  // 6. Weekly Report every Sunday at 10:00 AM IST
  const weeklyJob = cron.schedule(
    '0 10 * * 0',
    async () => {
      await runWeeklyReportRoutine();
    },
    istOptions
  );
  activeJobs.push({ name: 'Weekly Report', job: weeklyJob });

  isSchedulerRunning = true;
  console.log('🚀 [Cron] Kosmico Smart Health Notification Scheduler successfully initialized!');
  console.log('   - Hourly checks: 9 AM - 9 PM IST');
  console.log('   - 4-Hourly vitals: 8 AM, 12 PM, 4 PM, 8 PM IST');
  console.log('   - Morning motivation: 8:00 AM IST');
  console.log('   - Evening goals check: 8:00 PM IST');
  console.log('   - Daily summary & AI scores: 9:30 PM IST');
  console.log('   - Weekly report: Sunday 10:00 AM IST');
};

/**
 * Stop all scheduler jobs
 */
export const stopNotificationScheduler = () => {
  activeJobs.forEach(({ name, job }) => {
    job.stop();
    console.log(`⏹️ [Cron] Stopped ${name}`);
  });
  activeJobs.length = 0;
  isSchedulerRunning = false;
};

export default {
  initNotificationScheduler,
  stopNotificationScheduler,
  runHourlyHealthChecks,
  runFourHourlyVitalsChecks,
  runMorningRoutine,
  runEveningGoalsRoutine,
  runNightDailySummary,
  runWeeklyReportRoutine,
};
