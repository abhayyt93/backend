import StepLog from '../models/StepLog.js';
import GlucoseReading from '../models/GlucoseReading.js';
import MealLog from '../models/MealLog.js';
import User from '../models/User.js';
import ClinicalReport from '../models/ClinicalReport.js';

// Helper: Format Date object to 'YYYY-MM-DD'
const formatDateString = (dateObj) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Get Today's Date String in IST (Asia/Kolkata)
const getTodayDateStringIST = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch (_) {
    return formatDateString(new Date());
  }
};

// Helper: Convert Date or Timestamp to IST date string 'YYYY-MM-DD'
const toISTDateString = (dateObj) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateObj));
  } catch (_) {
    return formatDateString(dateObj);
  }
};

// Helper: Generate list of dates between startDate and endDate (inclusive)
const getDateRangeList = (startDateStr, endDateStr) => {
  const list = [];
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const current = new Date(sy, sm - 1, sd, 12, 0, 0);
  const targetEnd = new Date(ey, em - 1, ed, 12, 0, 0);

  while (current <= targetEnd) {
    list.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return list;
};

// Helper: Get Past N Dates ending with endRefDate
const getPastNDates = (n = 7, endRefDateStr) => {
  const dates = [];
  const [y, m, d] = endRefDateStr.split('-').map(Number);
  const baseDate = new Date(y, m - 1, d, 12, 0, 0);

  for (let i = n - 1; i >= 0; i--) {
    const cur = new Date(baseDate);
    cur.setDate(baseDate.getDate() - i);
    dates.push(formatDateString(cur));
  }
  return dates;
};

// Helper: Get Day Label ('Tue', 'Yesterday', 'Today')
const getDayLabel = (dateStr, todayStr, yesterdayStr) => {
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue, Wed, etc.
};

// @desc    Get Clinical 7-Day (or custom range / single date) Summary Report
// @route   GET /api/reports/clinical-summary
// @route   POST /api/reports/clinical-summary
// @access  Private (JWT Token required)
export const getClinicalSummaryReport = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`📋 [CLINICAL REPORT REQUEST] ${req.method} ${req.originalUrl}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Query:`, JSON.stringify(req.query));
    console.log(`   Body:`, JSON.stringify(req.body));

    const source = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;

    // 1. Parse Query & Body Parameters
    const daysParam = parseInt(source.days, 10);
    const days = !isNaN(daysParam) && daysParam > 0 ? daysParam : 7;
    const reqStartDate = source.startDate ? String(source.startDate).trim() : null;
    const reqEndDate = source.endDate ? String(source.endDate).trim() : null;
    const reqDate = source.date || source.selectedDate ? String(source.date || source.selectedDate).trim() : null;

    const todayIST = getTodayDateStringIST();
    const [ty, tm, td] = todayIST.split('-').map(Number);
    const yesterdayDate = new Date(ty, tm - 1, td - 1, 12, 0, 0);
    const yesterdayIST = formatDateString(yesterdayDate);

    // 2. Determine exact date list
    let dateList = [];
    if (reqStartDate && reqEndDate && /^\d{4}-\d{2}-\d{2}$/.test(reqStartDate) && /^\d{4}-\d{2}-\d{2}$/.test(reqEndDate)) {
      dateList = getDateRangeList(reqStartDate, reqEndDate);
    } else if (reqDate && /^\d{4}-\d{2}-\d{2}$/.test(reqDate)) {
      if (source.mode === 'single' || days === 1) {
        dateList = [reqDate];
      } else {
        dateList = getPastNDates(days, reqDate);
      }
    } else {
      const endRef = reqEndDate && /^\d{4}-\d{2}-\d{2}$/.test(reqEndDate) ? reqEndDate : todayIST;
      dateList = getPastNDates(days, endRef);
    }

    if (dateList.length === 0) {
      dateList = getPastNDates(7, todayIST);
    }

    const startDateStr = dateList[0];
    const endDateStr = dateList[dateList.length - 1];

    // 3. Fetch User profile details
    const user = await User.findById(userId).select('name email phoneNumber phone dailyActivities');
    const patientName = user?.name || 'Valued Patient';
    const patientEmail = user?.email || 'patient@kosmico.health';
    const patientPhone = user?.phoneNumber || user?.phone || '+919876543210';

    // 4. Fetch StepLogs for date range
    const stepLogs = await StepLog.find({
      user: userId,
      date: { $in: dateList },
    }).sort({ date: 1 });

    const stepLogMap = new Map();
    stepLogs.forEach((log) => {
      stepLogMap.set(log.date, log);
    });

    // 5. Fetch Glucose Readings for date range
    const filterStart = new Date(`${startDateStr}T00:00:00.000Z`);
    filterStart.setHours(filterStart.getHours() - 12);
    const filterEnd = new Date(`${endDateStr}T23:59:59.999Z`);
    filterEnd.setHours(filterEnd.getHours() + 12);

    const glucoseReadings = await GlucoseReading.find({
      user: userId,
      readingTime: { $gte: filterStart, $lte: filterEnd },
    }).sort({ readingTime: 1 });

    // Group glucose readings by IST date string
    const glucoseMap = new Map();
    glucoseReadings.forEach((reading) => {
      const rDate = toISTDateString(reading.readingTime);
      if (!glucoseMap.has(rDate)) {
        glucoseMap.set(rDate, []);
      }
      glucoseMap.get(rDate).push(reading);
    });

    // 5b. Fetch MealLogs for date range (carbohydrates)
    const mealLogs = await MealLog.find({
      user: userId,
      logTime: { $gte: filterStart, $lte: filterEnd },
    }).sort({ logTime: 1 });

    const mealMap = new Map();
    mealLogs.forEach((meal) => {
      const mDate = toISTDateString(meal.logTime);
      mealMap.set(mDate, (mealMap.get(mDate) || 0) + (meal.carbs || 0));
    });

    // 6. Build Daily Breakdown
    let totalSteps = 0;
    let totalWater = 0;
    let totalCarbs = 0;
    let sumSystolic = 0;
    let sumDiastolic = 0;
    let bpDaysCount = 0;
    let sumDailyGlucose = 0;
    let glucoseDaysCount = 0;
    let sumStress = 0;
    let stressDaysCount = 0;
    let sumEnergy = 0;
    let energyDaysCount = 0;

    const dailyBreakdown = dateList.map((dateStr) => {
      const stepLog = stepLogMap.get(dateStr);
      const userActivity = user?.dailyActivities?.find((a) => a.date === dateStr);

      const steps = stepLog ? (stepLog.steps || 0) : (userActivity ? (userActivity.steps || 0) : 0);
      const waterIntake = stepLog ? (stepLog.waterIntake || 0) : (userActivity ? (userActivity.waterIntake || 0) : 0);

      // BP determination: ONLY if explicitly checked and synced!
      let systolic = 0;
      let diastolic = 0;
      let pulse = 0;

      if (userActivity?.bp?.systolic && userActivity.bp.systolic > 0) {
        systolic = userActivity.bp.systolic;
        diastolic = userActivity.bp.diastolic || 0;
        pulse = userActivity.bp.pulse || 0;
      } else if (userActivity?.systolic && userActivity.systolic > 0) {
        systolic = userActivity.systolic;
        diastolic = userActivity.diastolic || 0;
      } else if (stepLog?.bp?.systolic && stepLog.bp.systolic > 0 && (stepLog.bp.systolic !== 118 || stepLog.bp.isManualOrScanned)) {
        systolic = stepLog.bp.systolic;
        diastolic = stepLog.bp.diastolic || 0;
        pulse = stepLog.bp.pulse || 0;
      }

      // Carbs determination: from MealLog, userActivity, or stepLog
      const mealCarbs = mealMap.get(dateStr) || 0;
      const actCarbs = userActivity?.carbsIntake !== undefined ? userActivity.carbsIntake : (userActivity?.carbs || 0);
      const logCarbs = stepLog?.carbsIntake !== undefined ? stepLog.carbsIntake : (stepLog?.carbs || 0);
      const carbsIntake = mealCarbs > 0 ? mealCarbs : (actCarbs > 0 ? actCarbs : logCarbs);

      // Stress score: 0 to 5. If not checked on this date, 0!
      const stressScore = userActivity?.stressScore !== undefined ? userActivity.stressScore : (userActivity?.stress !== undefined ? userActivity.stress : (stepLog?.stressScore || 0));

      // Mood & Energy: 0 to 5. If not checked on this date, 0!
      const moodAndEnergy = userActivity?.moodAndEnergy !== undefined ? userActivity.moodAndEnergy : (userActivity?.energyLevel !== undefined ? userActivity.energyLevel : (stepLog?.moodAndEnergy || stepLog?.energyLevel || 0));

      // Glucose for this date
      const dayReadings = glucoseMap.get(dateStr) || [];
      let avgGlucose = 0;
      if (dayReadings.length > 0) {
        const sumG = dayReadings.reduce((acc, curr) => acc + (curr.glucoseLevel || 0), 0);
        avgGlucose = parseFloat((sumG / dayReadings.length).toFixed(1));
      } else if (userActivity?.avgGlucose) {
        avgGlucose = parseFloat(userActivity.avgGlucose.toFixed(1));
      } else if (stepLog?.avgGlucose) {
        avgGlucose = parseFloat(stepLog.avgGlucose.toFixed(1));
      }

      totalSteps += steps;
      totalWater += waterIntake;
      totalCarbs += carbsIntake;

      if (systolic > 0) {
        sumSystolic += systolic;
        sumDiastolic += diastolic;
        bpDaysCount += 1;
      }

      if (avgGlucose > 0) {
        sumDailyGlucose += avgGlucose;
        glucoseDaysCount += 1;
      }

      if (stressScore > 0) {
        sumStress += stressScore;
        stressDaysCount += 1;
      }

      if (moodAndEnergy > 0) {
        sumEnergy += moodAndEnergy;
        energyDaysCount += 1;
      }

      const bpDisplay = (systolic > 0 && diastolic > 0) ? `${systolic}/${diastolic}` : '0/0';

      return {
        date: dateStr,
        day: getDayLabel(dateStr, todayIST, yesterdayIST),
        steps,
        footsteps: steps,
        waterIntake,
        hydration: waterIntake,
        carbs: carbsIntake,
        carbsIntake,
        carbs_intake: carbsIntake,
        avgGlucose,
        glucose: avgGlucose,
        bp: {
          systolic,
          diastolic,
          pulse,
        },
        systolic,
        diastolic,
        pulse,
        bloodPressure: bpDisplay,
        blood_pressure: bpDisplay,
        stressScore,
        stress: stressScore,
        stress_score: stressScore,
        moodAndEnergy,
        energyLevel: moodAndEnergy,
        energy: moodAndEnergy,
        mood: moodAndEnergy,
        mood_and_energy: moodAndEnergy,
      };
    });

    // 7. Calculate Summary Metrics
    const totalDaysCount = dateList.length || 7;
    const avgStepsDaily = Math.round(totalSteps / totalDaysCount);
    const avgWaterDailyMl = Math.round(totalWater / totalDaysCount);
    const avgSystolicBp = bpDaysCount > 0 ? Math.round(sumSystolic / bpDaysCount) : 0;
    const avgDiastolicBp = bpDaysCount > 0 ? Math.round(sumDiastolic / bpDaysCount) : 0;
    const avgCarbsDaily = Math.round(totalCarbs / totalDaysCount);
    const avgStressScore = stressDaysCount > 0 ? parseFloat((sumStress / stressDaysCount).toFixed(1)) : 0;
    const avgEnergyLevel = energyDaysCount > 0 ? parseFloat((sumEnergy / energyDaysCount).toFixed(1)) : 0;

    // Global Glucose metrics
    let overallAvgGlucose = glucoseDaysCount > 0 ? parseFloat((sumDailyGlucose / glucoseDaysCount).toFixed(1)) : 0;
    let timeInRangePercentage = 0;

    if (glucoseReadings.length > 0) {
      const totalG = glucoseReadings.reduce((acc, curr) => acc + (curr.glucoseLevel || 0), 0);
      overallAvgGlucose = parseFloat((totalG / glucoseReadings.length).toFixed(1));

      // Time In Range: 70 - 180 mg/dL (ADA standard)
      const inRangeReadings = glucoseReadings.filter(
        (r) => r.glucoseLevel >= 70 && r.glucoseLevel <= 180
      ).length;
      timeInRangePercentage = parseFloat(
        ((inRangeReadings / glucoseReadings.length) * 100).toFixed(1)
      );
    }

    // Estimated HbA1c formula: (Avg Glucose + 46.7) / 28.7
    const estHbA1c = overallAvgGlucose > 0 ? parseFloat(((overallAvgGlucose + 46.7) / 28.7).toFixed(2)) : 0;

    const reportId = source.reportId || `KOS-GLU-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const reportType = source.reportType || `${totalDaysCount}-Day Metabolic & Glycemic Clinical Summary`;
    const generatedAt = new Date().toISOString();

    const summaryMetrics = {
      avgGlucose: overallAvgGlucose,
      estHbA1c,
      timeInRangePercentage,
      totalStepsWeek: totalSteps,
      avgStepsDaily,
      totalWaterWeekMl: totalWater,
      avgWaterDailyMl,
      avgSystolicBp,
      avgDiastolicBp,
      avgCarbsDaily,
      avgStressScore,
      avgEnergyLevel,
    };

    const patientData = {
      name: source.patient?.name || patientName,
      email: source.patient?.email || patientEmail,
      phone: source.patient?.phone || patientPhone,
    };

    // Selected day / Latest day for top cards display
    const targetDayBreakdown = (reqDate && dailyBreakdown.find((d) => d.date === reqDate)) || dailyBreakdown[dailyBreakdown.length - 1] || {};

    const reportData = {
      patient: patientData,
      reportId,
      reportType,
      generatedAt,
      startDate: startDateStr,
      endDate: endDateStr,
      selectedDate: targetDayBreakdown.date,
      date: targetDayBreakdown.date,
      carbsIntake: targetDayBreakdown.carbsIntake,
      carbs: targetDayBreakdown.carbs,
      steps: targetDayBreakdown.steps,
      footsteps: targetDayBreakdown.steps,
      waterIntake: targetDayBreakdown.waterIntake,
      hydration: targetDayBreakdown.waterIntake,
      bp: targetDayBreakdown.bp,
      systolic: targetDayBreakdown.systolic,
      diastolic: targetDayBreakdown.diastolic,
      bloodPressure: targetDayBreakdown.bloodPressure,
      stressScore: targetDayBreakdown.stressScore,
      moodAndEnergy: targetDayBreakdown.moodAndEnergy,
      energyLevel: targetDayBreakdown.energyLevel,
      avgGlucose: targetDayBreakdown.avgGlucose,
      summaryMetrics,
      dailyBreakdown,
    };

    // 8. Persist the report in MongoDB (ClinicalReport collection)
    try {
      await ClinicalReport.findOneAndUpdate(
        { reportId },
        {
          user: userId,
          reportId,
          reportType,
          startDate: startDateStr,
          endDate: endDateStr,
          generatedAt: new Date(generatedAt),
          patient: patientData,
          summaryMetrics,
          dailyBreakdown,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✅ [ClinicalReport] Saved report ${reportId} for user ${userId} in MongoDB`);
    } catch (saveErr) {
      console.warn('Note: Could not save ClinicalReport snapshot:', saveErr.message);
    }

    // 9. Send JSON response
    return res.status(200).json({
      success: true,
      data: reportData,
      patient: patientData,
      reportId,
      reportType,
      generatedAt,
      startDate: startDateStr,
      endDate: endDateStr,
      selectedDate: targetDayBreakdown.date,
      date: targetDayBreakdown.date,
      carbsIntake: targetDayBreakdown.carbsIntake,
      carbs: targetDayBreakdown.carbs,
      steps: targetDayBreakdown.steps,
      footsteps: targetDayBreakdown.steps,
      waterIntake: targetDayBreakdown.waterIntake,
      hydration: targetDayBreakdown.waterIntake,
      bp: targetDayBreakdown.bp,
      systolic: targetDayBreakdown.systolic,
      diastolic: targetDayBreakdown.diastolic,
      bloodPressure: targetDayBreakdown.bloodPressure,
      stressScore: targetDayBreakdown.stressScore,
      moodAndEnergy: targetDayBreakdown.moodAndEnergy,
      energyLevel: targetDayBreakdown.energyLevel,
      avgGlucose: targetDayBreakdown.avgGlucose,
      summaryMetrics,
      dailyBreakdown,
    });
  } catch (error) {
    console.error('Error generating clinical summary report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate clinical summary report',
      error: error.message,
    });
  }
};

// @desc    Explicitly Save a Clinical Report Snapshot (when user downloads or shares in app)
// @route   POST /api/reports/save
// @route   POST /api/reports/download
// @route   POST /api/reports/share
// @access  Private
export const saveClinicalReport = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`📥 [SAVE CLINICAL REPORT REQUEST] ${req.method} ${req.originalUrl}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Body:`, JSON.stringify(req.body));

    const body = req.body || {};
    const reportData = body.data || body.report || body;

    const user = await User.findById(userId).select('name email phoneNumber phone');
    const patientData = {
      name: reportData.patient?.name || user?.name || 'Valued Patient',
      email: reportData.patient?.email || user?.email || 'patient@kosmico.health',
      phone: reportData.patient?.phone || user?.phoneNumber || user?.phone || '',
    };

    const reportId = reportData.reportId || `KOS-GLU-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const reportType = reportData.reportType || '7-Day Metabolic & Glycemic Clinical Summary';
    const startDate = reportData.startDate || getTodayDateStringIST();
    const endDate = reportData.endDate || getTodayDateStringIST();

    const savedDoc = await ClinicalReport.findOneAndUpdate(
      { reportId },
      {
        user: userId,
        reportId,
        reportType,
        startDate,
        endDate,
        generatedAt: reportData.generatedAt ? new Date(reportData.generatedAt) : new Date(),
        patient: patientData,
        summaryMetrics: reportData.summaryMetrics || {},
        dailyBreakdown: Array.isArray(reportData.dailyBreakdown) ? reportData.dailyBreakdown : [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`✅ [ClinicalReport] Manually Saved snapshot ${reportId} in MongoDB`);

    return res.status(200).json({
      success: true,
      message: 'Clinical report saved successfully',
      data: savedDoc,
    });
  } catch (error) {
    console.error('Error saving clinical report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save clinical report',
      error: error.message,
    });
  }
};

// @desc    Get past generated reports for the logged in user
// @route   GET /api/reports/history
// @access  Private
export const getReportHistory = async (req, res) => {
  try {
    const reports = await ClinicalReport.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching report history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report history',
      error: error.message,
    });
  }
};
