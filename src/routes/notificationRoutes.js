import express from 'express';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
  saveFCMToken,
  sendNotificationToUser,
  broadcastNotification,
  testMyNotification
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

// FCM Push Notifications
router.post('/fcm-token', protect, saveFCMToken);
router.post('/token', protect, saveFCMToken); // Alias
router.post('/send', protect, sendNotificationToUser);
router.post('/broadcast', protect, broadcastNotification);
router.post('/test', protect, testMyNotification);

export default router;
