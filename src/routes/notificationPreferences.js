import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import UserNotificationPreferences from '../models/UserNotificationPreferences.js';
import { getOrCreatePreferences } from '../services/notificationRuleEngine.js';

const router = express.Router();

const getTargetUserId = (req) => {
  return req.body?.userId || req.query?.userId || req.user?._id;
};

// Helper to normalize frequency strings (instant, 30m, 1h, 2h, daily, weekly)
const normalizeCategoryItem = (rawVal) => {
  const item = typeof rawVal === 'object' ? { ...rawVal } : { enabled: !!rawVal };
  if (item.frequency) {
    const freq = String(item.frequency).toLowerCase().trim();
    item.frequency = freq;
    if (freq === 'instant' || freq === 'realtime') {
      item.frequencyHours = 0;
    } else if (freq === '30m') {
      item.frequencyHours = 0.5;
      item.idleThresholdMinutes = 30;
    } else if (freq === '1h') {
      item.frequencyHours = 1;
      item.idleThresholdMinutes = 60;
    } else if (freq === '2h') {
      item.frequencyHours = 2;
      item.idleThresholdMinutes = 120;
    } else if (freq === 'daily') {
      item.frequencyHours = 24;
    } else if (freq === 'weekly') {
      item.frequencyHours = 168;
    }
  }
  return item;
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

    const { categories, quietHours, channels, applyToAll } = req.body;

    if (categories && typeof categories === 'object') {
      if (!preferences.categories) preferences.categories = {};

      for (const [key, rawVal] of Object.entries(categories)) {
        const val = normalizeCategoryItem(rawVal);
        const existing = preferences.categories[key]
          ? (typeof preferences.categories[key].toObject === 'function'
              ? preferences.categories[key].toObject()
              : preferences.categories[key])
          : {};

        preferences.categories[key] = { ...existing, ...val };

        // Alias propagation for admin & mobile compatibility
        if (key === 'waterIntake') {
          preferences.categories.hydration = {
            ...(preferences.categories.hydration?.toObject?.() || {}),
            ...val,
          };
          preferences.categories.waterGoals = {
            ...(preferences.categories.waterGoals?.toObject?.() || {}),
            ...val,
          };
        } else if (key === 'hydration') {
          preferences.categories.waterIntake = {
            ...(preferences.categories.waterIntake?.toObject?.() || {}),
            ...val,
          };
        } else if (key === 'stepCount') {
          preferences.categories.stepGoals = {
            ...(preferences.categories.stepGoals?.toObject?.() || {}),
            ...val,
          };
          preferences.categories.inactivity = {
            ...(preferences.categories.inactivity?.toObject?.() || {}),
            ...val,
          };
        } else if (key === 'bloodPressure') {
          preferences.categories.bpAlerts = {
            ...(preferences.categories.bpAlerts?.toObject?.() || {}),
            ...val,
          };
        } else if (key === 'bpAlerts') {
          preferences.categories.bloodPressure = {
            ...(preferences.categories.bloodPressure?.toObject?.() || {}),
            ...val,
          };
        } else if (key === 'promos') {
          preferences.categories.promotions = {
            ...(preferences.categories.promotions?.toObject?.() || {}),
            ...val,
          };
        } else if (key === 'promotions') {
          preferences.categories.promos = {
            ...(preferences.categories.promos?.toObject?.() || {}),
            ...val,
          };
        }
      }
      preferences.markModified('categories');
    }

    if (quietHours && typeof quietHours === 'object') {
      preferences.quietHours = {
        ...(preferences.quietHours?.toObject ? preferences.quietHours.toObject() : preferences.quietHours),
        ...quietHours,
      };
      preferences.markModified('quietHours');
    }

    if (channels && typeof channels === 'object') {
      preferences.channels = {
        ...(preferences.channels?.toObject ? preferences.channels.toObject() : preferences.channels),
        ...channels,
      };
      preferences.markModified('channels');
    }

    const updated = await preferences.save();

    // If admin requested global sync, propagate to all users
    if (applyToAll) {
      await UserNotificationPreferences.updateMany(
        {},
        {
          $set: {
            categories: updated.categories,
            quietHours: updated.quietHours,
            channels: updated.channels,
          },
        }
      );
    }

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

// @desc    Toggle single category ON/OFF or update frequency
// @route   PUT /api/notification-preferences/category/:category
// @access  Private
router.put('/category/:category', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const { category } = req.params;
    const { enabled, frequency, frequencyHours, idleThresholdMinutes, reminderHour } = req.body;

    let preferences = await getOrCreatePreferences(targetUserId);

    if (!preferences.categories[category]) {
      preferences.categories[category] = {};
    }

    if (typeof enabled === 'boolean') {
      preferences.categories[category].enabled = enabled;
    }
    if (frequency) {
      const normalized = normalizeCategoryItem({ frequency });
      preferences.categories[category].frequency = normalized.frequency;
      if (normalized.frequencyHours !== undefined) {
        preferences.categories[category].frequencyHours = normalized.frequencyHours;
      }
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

    preferences.markModified('categories');
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
