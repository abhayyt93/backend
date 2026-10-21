import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendPushNotification, sendMulticastNotification } from '../config/firebase.js';

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

// @desc    Register or update FCM device token for logged in user
// @route   POST /api/notifications/fcm-token
// @access  Private
const saveFCMToken = async (req, res, next) => {
  try {
    const { fcmToken, token, platform } = req.body;
    const finalToken = fcmToken || token;

    if (!finalToken) {
      return res.status(400).json({ success: false, message: 'fcmToken is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.fcmToken = finalToken;
    if (platform) {
      user.fcmPlatform = platform.toLowerCase();
    }
    await user.save();

    console.log(`📱 [FCM] Token saved for user: ${user.name} (${user._id})`);

    res.status(200).json({
      success: true,
      message: 'FCM Token registered successfully',
      fcmToken: user.fcmToken,
      platform: user.fcmPlatform,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send push notification to a specific user
// @route   POST /api/notifications/send
// @route   POST /api/admin/notifications/send
// @access  Private
const sendNotificationToUser = async (req, res, next) => {
  try {
    const { userId, title, message, body, imageUrl, data } = req.body;
    const notifBody = body || message;

    if (!userId || !title || !notifBody) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and body/message are required',
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    // 1. Save in-app notification in MongoDB
    const notification = await Notification.create({
      user: targetUser._id,
      title,
      message: notifBody,
      imageUrl: imageUrl || '',
      data: data || {},
      isRead: false,
    });

    // 2. Dispatch FCM Push Notification to device if token exists
    let fcmResult = { sent: false, reason: 'No FCM token registered for this user' };
    if (targetUser.fcmToken) {
      fcmResult = await sendPushNotification({
        token: targetUser.fcmToken,
        title,
        body: notifBody,
        imageUrl,
        data: data || {},
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification processed',
      notification,
      fcm: fcmResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Broadcast push notification to ALL users (e.g. offers, discounts, announcements)
// @route   POST /api/admin/notifications/broadcast
// @route   POST /api/notifications/broadcast
// @access  Private
const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, body, imageUrl, data } = req.body;
    const notifBody = body || message;

    if (!title || !notifBody) {
      return res.status(400).json({
        success: false,
        message: 'title and body/message are required',
      });
    }

    // 1. Find all users with an active FCM token
    const usersWithTokens = await User.find({
      fcmToken: { $exists: true, $ne: '' },
    }).select('_id name fcmToken');

    const tokens = usersWithTokens.map((u) => u.fcmToken).filter(Boolean);

    // 2. Save notifications in database for these users
    const notifDocs = usersWithTokens.map((u) => ({
      user: u._id,
      title,
      message: notifBody,
      imageUrl: imageUrl || '',
      data: data || {},
      isRead: false,
    }));

    if (notifDocs.length > 0) {
      await Notification.insertMany(notifDocs);
    }

    // 3. Dispatch multicast push notifications via Firebase
    let fcmResult = { success: false, message: 'No devices registered' };
    if (tokens.length > 0) {
      // FCM allows max 500 tokens per multicast call
      const chunkSize = 500;
      let totalSuccess = 0;
      let totalFailure = 0;

      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        const chunkResult = await sendMulticastNotification({
          tokens: chunk,
          title,
          body: notifBody,
          imageUrl,
          data: data || {},
        });
        if (chunkResult.success) {
          totalSuccess += chunkResult.successCount || 0;
          totalFailure += chunkResult.failureCount || 0;
        }
      }

      fcmResult = {
        success: true,
        totalTokens: tokens.length,
        deliveredCount: totalSuccess,
        failedCount: totalFailure,
      };
    }

    res.status(200).json({
      success: true,
      message: `Broadcast sent to ${tokens.length} registered device(s)`,
      summary: fcmResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send test notification to the logged in user
// @route   POST /api/notifications/test
// @access  Private
const testMyNotification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'You have not registered an FCM device token yet. Please call /api/notifications/fcm-token first.',
      });
    }

    const title = req.body.title || 'Kosmico Wellness 🎉';
    const body = req.body.body || req.body.message || 'This is a test notification from Kosmico Backend!';
    const imageUrl = req.body.imageUrl || '';

    const fcmResult = await sendPushNotification({
      token: user.fcmToken,
      title,
      body,
      imageUrl,
      data: req.body.data || { test: 'true', time: new Date().toISOString() },
    });

    res.status(200).json({
      success: true,
      message: 'Test notification triggered',
      result: fcmResult,
    });
  } catch (error) {
    next(error);
  }
};

export {
  getNotifications,
  markAsRead,
  deleteNotification,
  saveFCMToken,
  sendNotificationToUser,
  broadcastNotification,
  testMyNotification,
};
