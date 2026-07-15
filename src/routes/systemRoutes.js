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
  const userVersion = req.query.version;

  // If update is disabled globally by admin, no update is available
  if (!latestAppUpdate.isUpdateAvailable) {
    return res.json({
      success: true,
      isUpdateAvailable: false
    });
  }

  // If user version is provided, compare it
  if (userVersion) {
    const currentParts = userVersion.split('.').map(num => parseInt(num, 10) || 0);
    const latestParts = latestAppUpdate.version.split('.').map(num => parseInt(num, 10) || 0);
    
    let isOlder = false;
    const maxLength = Math.max(currentParts.length, latestParts.length);
    for (let i = 0; i < maxLength; i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      if (currentPart < latestPart) {
        isOlder = true;
        break;
      }
      if (currentPart > latestPart) {
        isOlder = false;
        break;
      }
    }

    return res.json({
      success: true,
      isUpdateAvailable: isOlder,
      update: isOlder ? latestAppUpdate : null
    });
  }

  // Fallback if no version is sent by frontend (compatibility with older app versions)
  res.json({
    success: true,
    isUpdateAvailable: latestAppUpdate.isUpdateAvailable,
    update: latestAppUpdate
  });
});

export default router;
