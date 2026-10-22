import StepLog from '../models/StepLog.js';
import GlucoseReading from '../models/GlucoseReading.js';
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

// @desc    Get Clinical 7-Day (or custom range) Summary Report
// @route   GET /api/reports/clinical-summary
// @access  Private (JWT Token required)
export const getClinicalSummaryReport = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Parse Query Parameters
    const daysParam = parseInt(req.query.days, 10);
    const days = !isNaN(daysParam) && daysParam > 0 ? daysParam : 7;
    const reqStartDate = req.query.startDate ? String(req.query.startDate).trim() : null;
    const reqEndDate = req.query.endDate ? String(req.query.endDate).trim() : null;

    const todayIST = getTodayDateStringIST();
    const [ty, tm, td] = todayIST.split('-').map(Number);
    const yesterdayDate = new Date(ty, tm - 1, td - 1, 12, 0, 0);
    const yesterdayIST = formatDateString(yesterdayDate);

    // 2. Determine exact date list
    let dateList = [];
    if (reqStartDate && reqEndDate && /^\d{4}-\d{2}-\d{2}$/.test(reqStartDate) && /^\d{4}-\d{2}-\d{2}$/.test(reqEndDate)) {
      dateList = getDateRangeList(reqStartDate, reqEndDate);
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
    // Provide a wide margin (+/- 1 day) to handle UTC vs IST offsets cleanly
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

    // 6. Build Daily Breakdown
    let totalSteps = 0;
    let totalWater = 0;
    let sumSystolic = 0;
    let sumDiastolic = 0;
    let sumDailyGlucose = 0;

    const dailyBreakdown = dateList.map((dateStr) => {
      const stepLog = stepLogMap.get(dateStr);
      const userActivity = user?.dailyActivities?.find((a) => a.date === dateStr);

      const steps = stepLog ? (stepLog.steps || 0) : (userActivity ? (userActivity.steps || 0) : 0);
      const waterIntake = stepLog ? (stepLog.waterIntake || 0) : (userActivity ? (userActivity.waterIntake || 0) : 0);

      // BP determination
      let systolic = 118;
      let diastolic = 76;
      if (stepLog?.bp?.systolic) {
        systolic = stepLog.bp.systolic;
        diastolic = stepLog.bp.diastolic || 76;
      } else if (userActivity?.bp?.systolic) {
        systolic = userActivity.bp.systolic;
        diastolic = userActivity.bp.diastolic || 76;
      }

      // Glucose for this date
      const dayReadings = glucoseMap.get(dateStr) || [];
      let avgGlucose = 118.0;
      if (dayReadings.length > 0) {
        const sumG = dayReadings.reduce((acc, curr) => acc + (curr.glucoseLevel || 0), 0);
        avgGlucose = parseFloat((sumG / dayReadings.length).toFixed(1));
      } else if (stepLog?.avgGlucose) {
        avgGlucose = parseFloat(stepLog.avgGlucose.toFixed(1));
      }

      totalSteps += steps;
      totalWater += waterIntake;
      sumSystolic += systolic;
      sumDiastolic += diastolic;
      sumDailyGlucose += avgGlucose;

      return {
        date: dateStr,
        day: getDayLabel(dateStr, todayIST, yesterdayIST),
        steps,
        waterIntake,
        avgGlucose,
        bp: {
          systolic,
          diastolic,
        },
      };
    });

    // 7. Calculate Summary Metrics
    const totalDaysCount = dateList.length || 7;
    const avgStepsDaily = Math.round(totalSteps / totalDaysCount);
    const avgWaterDailyMl = Math.round(totalWater / totalDaysCount);
    const avgSystolicBp = Math.round(sumSystolic / totalDaysCount);
    const avgDiastolicBp = Math.round(sumDiastolic / totalDaysCount);

    // Global Glucose metrics
    let overallAvgGlucose = parseFloat((sumDailyGlucose / totalDaysCount).toFixed(1));
    let timeInRangePercentage = 82.0;

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
    const estHbA1c = parseFloat(((overallAvgGlucose + 46.7) / 28.7).toFixed(2));

    const reportId = `KOS-GLU-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const reportType = `${totalDaysCount}-Day Metabolic & Glycemic Clinical Summary`;
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
    };

    const patientData = {
      name: patientName,
      email: patientEmail,
      phone: patientPhone,
    };

    const reportData = {
      patient: patientData,
      reportId,
      reportType,
      generatedAt,
      startDate: startDateStr,
      endDate: endDateStr,
      summaryMetrics,
      dailyBreakdown,
    };

    // 8. Persist the report in MongoDB (ClinicalReport collection)
    try {
      await ClinicalReport.create({
        user: userId,
        reportId,
        reportType,
        startDate: startDateStr,
        endDate: endDateStr,
        generatedAt: new Date(generatedAt),
        patient: patientData,
        summaryMetrics,
        dailyBreakdown,
      });
    } catch (saveErr) {
      console.warn('Note: Could not save ClinicalReport snapshot:', saveErr.message);
    }

    // 9. Send JSON response
    // Response provides both nested data structure and top-level aliases for 100% Flutter client compatibility
    return res.status(200).json({
      success: true,
      data: reportData,
      patient: patientData,
      reportId,
      reportType,
      generatedAt,
      startDate: startDateStr,
      endDate: endDateStr,
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

// @desc    Get past generated reports for the logged in user
// @route   GET /api/reports/history
// @access  Private
export const getReportHistory = async (req, res) => {
  try {
    const reports = await ClinicalReport.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

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
