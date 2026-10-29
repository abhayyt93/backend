import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import NotificationHistory from '../models/NotificationHistory.js';

const router = express.Router();

const getTargetUserId = (req) => {
  return req.body?.userId || req.query?.userId || req.user?._id;
};

// @desc    Get notification history with pagination & filters
// @route   GET /api/notification-history
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { user: targetUserId };

    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }
    if (req.query.status) {
      query.deliveryStatus = req.query.status;
    }

    const total = await NotificationHistory.countDocuments(query);
    const unreadCount = await NotificationHistory.countDocuments({
      user: targetUserId,
      isRead: false,
    });

    const history = await NotificationHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
      history,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get unread notification count badge
// @route   GET /api/notification-history/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const unreadCount = await NotificationHistory.countDocuments({
      user: targetUserId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark a single notification as read
// @route   PUT /api/notification-history/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const notification = await NotificationHistory.findOne({
      _id: req.params.id,
      user: targetUserId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notification-history/mark-all-read
// @access  Private
router.put('/mark-all-read', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const result = await NotificationHistory.updateMany(
      { user: targetUserId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk mark multiple notifications as read
// @route   POST /api/notification-history/bulk-read
// @access  Private
router.post('/bulk-read', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of notification ids is required',
      });
    }

    const result = await NotificationHistory.updateMany(
      { _id: { $in: ids }, user: targetUserId },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'Selected notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Clear all notification history for user
// @route   DELETE /api/notification-history/clear-all
// @access  Private
router.delete('/clear-all', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const result = await NotificationHistory.deleteMany({ user: targetUserId });

    res.status(200).json({
      success: true,
      message: 'Notification history cleared',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete single notification history record
// @route   DELETE /api/notification-history/:id
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const notification = await NotificationHistory.findOneAndDelete({
      _id: req.params.id,
      user: targetUserId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted from history',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
