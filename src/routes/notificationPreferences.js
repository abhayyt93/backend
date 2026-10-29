import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import UserNotificationPreferences from '../models/UserNotificationPreferences.js';
import { getOrCreatePreferences } from '../services/notificationRuleEngine.js';

const router = express.Router();

const getTargetUserId = (req) => {
  return req.body?.userId || req.query?.userId || req.user?._id;
};

// @desc    Get user's notification preferences
// @route   GET /api/notification-preferences
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const preferences = await getOrCreatePreferences(targetUserId);
    res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user's notification preferences
// @route   PUT /api/notification-preferences
// @route   POST /api/notification-preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    let preferences = await UserNotificationPreferences.findOne({ user: targetUserId });
    if (!preferences) {
      preferences = await getOrCreatePreferences(targetUserId);
    }

    const { categories, quietHours, channels } = req.body;

    if (categories && typeof categories === 'object') {
      // Deep merge categories
      for (const [key, val] of Object.entries(categories)) {
        if (preferences.categories[key]) {
          preferences.categories[key] = {
            ...preferences.categories[key].toObject(),
            ...val,
          };
        } else {
          preferences.categories[key] = val;
        }
      }
    }

    if (quietHours && typeof quietHours === 'object') {
      preferences.quietHours = {
        ...preferences.quietHours.toObject(),
        ...quietHours,
      };
    }

    if (channels && typeof channels === 'object') {
      preferences.channels = {
        ...preferences.channels.toObject(),
        ...channels,
      };
    }

    const updated = await preferences.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: updated,
    });
  } catch (error) {
    next(error);
  }
};

router.put('/', protect, updatePreferences);
router.post('/', protect, updatePreferences);

// @desc    Toggle or configure quiet hours specifically
// @route   PUT /api/notification-preferences/quiet-hours
// @access  Private
router.put('/quiet-hours', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const { enabled, start, end, timezone } = req.body;
    let preferences = await getOrCreatePreferences(targetUserId);

    if (typeof enabled === 'boolean') preferences.quietHours.enabled = enabled;
    if (start) preferences.quietHours.start = start;
    if (end) preferences.quietHours.end = end;
    if (timezone) preferences.quietHours.timezone = timezone;

    await preferences.save();

    res.status(200).json({
      success: true,
      message: 'Quiet hours settings updated',
      quietHours: preferences.quietHours,
      isCurrentlyQuiet: preferences.isInQuietHours(),
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle single category ON/OFF
// @route   PUT /api/notification-preferences/category/:category
// @access  Private
router.put('/category/:category', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const { category } = req.params;
    const { enabled, frequencyHours, idleThresholdMinutes, reminderHour } = req.body;

    let preferences = await getOrCreatePreferences(targetUserId);

    if (!preferences.categories[category]) {
      return res.status(400).json({
        success: false,
        message: `Unknown notification category: ${category}`,
      });
    }

    if (typeof enabled === 'boolean') {
      preferences.categories[category].enabled = enabled;
    }
    if (frequencyHours !== undefined) {
      preferences.categories[category].frequencyHours = frequencyHours;
    }
    if (idleThresholdMinutes !== undefined) {
      preferences.categories[category].idleThresholdMinutes = idleThresholdMinutes;
    }
    if (reminderHour !== undefined) {
      preferences.categories[category].reminderHour = reminderHour;
    }

    await preferences.save();

    res.status(200).json({
      success: true,
      message: `Category ${category} updated`,
      category: preferences.categories[category],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
