import express from 'express';
import { isMaintenanceMode } from '../config/maintenanceState.js';
import { latestAppUpdate } from '../config/appUpdateState.js';

const router = express.Router();

// @desc    Get public maintenance status (for frontend polling)
// @route   GET /api/system/status
// @access  Public
router.get('/status', (req, res) => {
  res.json({
    success: true,
    isMaintenanceMode: isMaintenanceMode
  });
});

// @desc    Get latest app update (for frontend banner)
// @route   GET /api/system/updates/latest
// @access  Public
router.get('/updates/latest', (req, res) => {
  res.json({
    success: true,
    update: latestAppUpdate
  });
});

export default router;
