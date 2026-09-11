import express from 'express';
import { isMaintenanceMode } from '../config/maintenanceState.js';
import AppConfig from '../models/AppConfig.js';
import { compareVersions } from '../utils/versionCheck.js';

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
router.get('/updates/latest', async (req, res) => {
  try {
    const userVersion = req.query.version || req.headers['app-version'] || req.headers['x-app-version'] || '1.0.0';
    const platform = (req.query.platform || req.headers['platform'] || req.headers['x-platform'] || 'android').toLowerCase();

    const config = await AppConfig.findOne({ platform });

    if (!config) {
      return res.json({ success: true, isUpdateAvailable: false, update: null });
    }

    const isOlder = compareVersions(userVersion, config.latest_version) < 0;
    const isForceUpdate = config.force_update && compareVersions(userVersion, config.min_required_version) < 0;

    return res.json({
      success: true,
      isUpdateAvailable: isOlder,
      playStoreUrl: config.playstore_url,
      playstoreUrl: config.playstore_url,
      storeUrl: config.playstore_url,
      appStoreUrl: config.playstore_url,
      url: config.playstore_url,
      link: config.playstore_url,
      update: {
        isUpdateAvailable: isOlder,
        title: isForceUpdate ? "Critical Update Required" : "New Update Available",
        version: config.latest_version,
        type: isForceUpdate ? "MAJOR" : "MINOR",
        releaseNotes: isForceUpdate ? "Please update the app to continue." : "A new version of the app is available.",
        playStoreUrl: config.playstore_url,
        playstoreUrl: config.playstore_url,
        playstore_url: config.playstore_url,
        storeUrl: config.playstore_url,
        appStoreUrl: config.playstore_url,
        url: config.playstore_url,
        link: config.playstore_url,
        publishedAt: config.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
