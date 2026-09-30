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
      message: isSubscribed ? 'Full data unlocked.' : 'Showing 20% data. Please subscribe to view full plate scan history.'
    });
  } catch (error) {
    next(error);
  }
};
