import Notification from '../models/Notification.js';

// @desc    Get all notifications for logged in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 }); // Newest first

    res.json(notifications);
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

export { getNotifications, markAsRead };
