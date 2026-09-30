// @desc    Get BP Scan Data
// @route   GET /api/scans/bp
// @access  Private
export const getBPScanData = async (req, res, next) => {
  try {
    const isSubscribed = req.user.isSubscribed;
    
    // Dummy full data (10 items) for demonstration
    const fullData = [
      { id: 1, systolic: 120, diastolic: 80, date: '2023-01-01' },
      { id: 2, systolic: 122, diastolic: 82, date: '2023-01-02' },
      { id: 3, systolic: 118, diastolic: 79, date: '2023-01-03' },
      { id: 4, systolic: 125, diastolic: 85, date: '2023-01-04' },
      { id: 5, systolic: 130, diastolic: 88, date: '2023-01-05' },
      { id: 6, systolic: 121, diastolic: 81, date: '2023-01-06' },
      { id: 7, systolic: 119, diastolic: 78, date: '2023-01-07' },
      { id: 8, systolic: 124, diastolic: 83, date: '2023-01-08' },
      { id: 9, systolic: 128, diastolic: 86, date: '2023-01-09' },
      { id: 10, systolic: 122, diastolic: 80, date: '2023-01-10' },
    ];

    let responseData = fullData;

    if (!isSubscribed) {
      // Show only 20% of data
      const allowedCount = Math.ceil(fullData.length * 0.2);
      responseData = fullData.slice(0, allowedCount);
    }

    res.status(200).json({
      success: true,
      isSubscribed,
      data: responseData,
      message: isSubscribed ? 'Full data unlocked.' : 'Showing 20% data. Please subscribe to view full BP scan history.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Plate Scan Data
// @route   GET /api/scans/plate
// @access  Private
export const getPlateScanData = async (req, res, next) => {
  try {
    const isSubscribed = req.user.isSubscribed;
    
    // Dummy full data (10 items) for demonstration
    const fullData = [
      { id: 1, meal: 'Breakfast', calories: 300, date: '2023-01-01' },
      { id: 2, meal: 'Lunch', calories: 600, date: '2023-01-01' },
      { id: 3, meal: 'Dinner', calories: 500, date: '2023-01-01' },
      { id: 4, meal: 'Breakfast', calories: 350, date: '2023-01-02' },
      { id: 5, meal: 'Lunch', calories: 650, date: '2023-01-02' },
      { id: 6, meal: 'Dinner', calories: 450, date: '2023-01-02' },
      { id: 7, meal: 'Breakfast', calories: 280, date: '2023-01-03' },
      { id: 8, meal: 'Lunch', calories: 700, date: '2023-01-03' },
      { id: 9, meal: 'Dinner', calories: 550, date: '2023-01-03' },
      { id: 10, meal: 'Snack', calories: 200, date: '2023-01-03' },
    ];

    let responseData = fullData;

    if (!isSubscribed) {
      // Show only 20% of data
      const allowedCount = Math.ceil(fullData.length * 0.2);
      responseData = fullData.slice(0, allowedCount);
    }

    res.status(200).json({
      success: true,
      isSubscribed,
      data: responseData,
      message: isSubscribed ? 'Full data unlocked.' : 'Showing 20% data. Please subscribe to view full Plate AI scan history.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Smartwatch Sync Data (Premium)
// @route   GET /api/scans/smartwatch
// @access  Private
export const getSmartwatchSyncData = async (req, res, next) => {
  try {
    const isSubscribed = req.user.isSubscribed;
    
    // Dummy full data (10 items) for demonstration
    const fullData = [
      { id: 1, steps: 5000, heartRate: 72, date: '2023-01-01' },
      { id: 2, steps: 6000, heartRate: 75, date: '2023-01-02' },
      { id: 3, steps: 8000, heartRate: 70, date: '2023-01-03' },
      { id: 4, steps: 10000, heartRate: 80, date: '2023-01-04' },
      { id: 5, steps: 12000, heartRate: 85, date: '2023-01-05' },
      { id: 6, steps: 7000, heartRate: 74, date: '2023-01-06' },
      { id: 7, steps: 9000, heartRate: 78, date: '2023-01-07' },
      { id: 8, steps: 11000, heartRate: 82, date: '2023-01-08' },
      { id: 9, steps: 13000, heartRate: 88, date: '2023-01-09' },
      { id: 10, steps: 15000, heartRate: 90, date: '2023-01-10' },
    ];

    let responseData = fullData;

    if (!isSubscribed) {
      const allowedCount = Math.ceil(fullData.length * 0.2);
      responseData = fullData.slice(0, allowedCount);
    }

    res.status(200).json({
      success: true,
      isSubscribed,
      data: responseData,
      message: isSubscribed ? 'Full data unlocked.' : 'Showing 20% data. Please subscribe to view full Smartwatch Sync history.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Care Community Data (Premium)
// @route   GET /api/scans/care-community
// @access  Private
export const getCareCommunityData = async (req, res, next) => {
  try {
    const isSubscribed = req.user.isSubscribed;
    
    // Dummy full data (10 items) for demonstration
    const fullData = [
      { id: 1, topic: 'Diabetes Management', members: 150, date: '2023-01-01' },
      { id: 2, topic: 'Healthy Eating', members: 200, date: '2023-01-02' },
      { id: 3, topic: 'Workout Routines', members: 180, date: '2023-01-03' },
      { id: 4, topic: 'Mental Health Support', members: 300, date: '2023-01-04' },
      { id: 5, topic: 'Yoga for Beginners', members: 120, date: '2023-01-05' },
      { id: 6, topic: 'Senior Care', members: 90, date: '2023-01-06' },
      { id: 7, topic: 'Cardio Tips', members: 210, date: '2023-01-07' },
      { id: 8, topic: 'Weight Loss Journey', members: 400, date: '2023-01-08' },
      { id: 9, topic: 'Sleep Optimization', members: 160, date: '2023-01-09' },
      { id: 10, topic: 'Stress Relief', members: 250, date: '2023-01-10' },
    ];

    let responseData = fullData;

    if (!isSubscribed) {
      const allowedCount = Math.ceil(fullData.length * 0.2);
      responseData = fullData.slice(0, allowedCount);
    }

    res.status(200).json({
      success: true,
      isSubscribed,
      data: responseData,
      message: isSubscribed ? 'Full data unlocked.' : 'Showing 20% data. Please subscribe to view full Care Community topics.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Activity Impact Data (Premium)
// @route   GET /api/scans/activity-impact
// @access  Private
export const getActivityImpactData = async (req, res, next) => {
  try {
    const isSubscribed = req.user.isSubscribed;
    
    // Dummy full data (10 items) for demonstration
    const fullData = [
      { id: 1, activity: 'Running', impactScore: 85, date: '2023-01-01' },
      { id: 2, activity: 'Walking', impactScore: 50, date: '2023-01-02' },
      { id: 3, activity: 'Cycling', impactScore: 75, date: '2023-01-03' },
      { id: 4, activity: 'Swimming', impactScore: 90, date: '2023-01-04' },
      { id: 5, activity: 'Yoga', impactScore: 60, date: '2023-01-05' },
      { id: 6, activity: 'Weightlifting', impactScore: 80, date: '2023-01-06' },
      { id: 7, activity: 'HIIT', impactScore: 95, date: '2023-01-07' },
      { id: 8, activity: 'Dancing', impactScore: 70, date: '2023-01-08' },
      { id: 9, activity: 'Pilates', impactScore: 65, date: '2023-01-09' },
      { id: 10, activity: 'Stretching', impactScore: 40, date: '2023-01-10' },
    ];

    let responseData = fullData;

    if (!isSubscribed) {
      const allowedCount = Math.ceil(fullData.length * 0.2);
      responseData = fullData.slice(0, allowedCount);
    }

    res.status(200).json({
      success: true,
      isSubscribed,
      data: responseData,
      message: isSubscribed ? 'Full data unlocked.' : 'Showing 20% data. Please subscribe to view full Activity Impact analysis.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Health Diary Data (Free)
// @route   GET /api/scans/health-diary
// @access  Private
export const getHealthDiaryData = async (req, res, next) => {
  try {
    const isSubscribed = req.user.isSubscribed; // Doesn't affect return data length
    
    // Dummy full data (10 items) for demonstration
    const fullData = [
      { id: 1, note: 'Felt great today!', date: '2023-01-01' },
      { id: 2, note: 'A bit tired after workout.', date: '2023-01-02' },
      { id: 3, note: 'Ate healthy.', date: '2023-01-03' },
      { id: 4, note: 'Had trouble sleeping.', date: '2023-01-04' },
      { id: 5, note: 'Hit my step goal!', date: '2023-01-05' },
      { id: 6, note: 'Drank 3 liters of water.', date: '2023-01-06' },
      { id: 7, note: 'Skipped breakfast.', date: '2023-01-07' },
      { id: 8, note: 'Meditated for 10 minutes.', date: '2023-01-08' },
      { id: 9, note: 'Feeling stressed.', date: '2023-01-09' },
      { id: 10, note: 'Recovered well.', date: '2023-01-10' },
    ];

    // Health diary is free, so we always return full data.
    res.status(200).json({
      success: true,
      isSubscribed,
      data: fullData,
      message: 'Health Diary is a free feature. Full data loaded.'
    });
  } catch (error) {
    next(error);
  }
};
