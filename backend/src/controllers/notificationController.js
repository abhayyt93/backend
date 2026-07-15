import Notification from '../models/Notification.js';

// In-memory array to track deleted notification IDs (no database writes)
let deletedNotificationIds = [];

// @desc    Get all notifications for logged in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 }); // Newest first

    // Filter out notifications that were deleted in-memory
    const activeNotifications = notifications.filter(
      (n) => !deletedNotificationIds.includes(n._id.toString())
    );

    res.json(activeNotifications);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
      // Ensure the notification belongs to the user
      if (notification.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized to update this notification');
      }

      notification.isRead = true;
      const updatedNotification = await notification.save();
      res.json(updatedNotification);
    } else {
      res.status(404);
      throw new Error('Notification not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notification (in-memory only)
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
      // Ensure the notification belongs to the user
      if (notification.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized to delete this notification');
      }

      // Add to in-memory deleted list instead of database delete
      const notifIdStr = notification._id.toString();
      if (!deletedNotificationIds.includes(notifIdStr)) {
        deletedNotificationIds.push(notifIdStr);
      }

      res.json({ success: true, message: 'Notification removed from view' });
    } else {
      res.status(404);
      throw new Error('Notification not found');
    }
  } catch (error) {
    next(error);
  }
};

export { getNotifications, markAsRead, deleteNotification };
