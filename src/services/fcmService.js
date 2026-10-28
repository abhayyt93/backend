import messagingInstance from '../config/firebase.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import NotificationHistory from '../models/NotificationHistory.js';

/**
 * FCM Service provides complete push notification handling:
 * - Single user push notifications
 * - Multicast (batch tokens)
 * - Topic-based messaging
 * - Silent data-only messages for background sync
 * - Token validation
 * - Automatic persistence into NotificationHistory and in-app Notification models
 */

/**
 * Validate FCM token format
 * @param {string} token
 * @returns {boolean}
 */
export const validateToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  // FCM tokens typically have lengths > 100 characters and contain standard base64/url-safe chars
  return trimmed.length >= 32;
};

/**
 * Send push notification to a single user
 * @param {Object} options
 * @param {string|Object} options.userId - User ID or User document
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body/message
 * @param {string} [options.category='system'] - Category (hydration, inactivity, glucose, etc.)
 * @param {string} [options.type='ALERT'] - Notification type
 * @param {string} [options.imageUrl] - Image URL
 * @param {Object} [options.data={}] - Custom data payload
 * @param {boolean} [options.saveHistory=true] - Whether to save to NotificationHistory
 * @param {boolean} [options.saveInApp=true] - Whether to save to Notification (in-app list)
 * @returns {Promise<Object>}
 */
export const sendToUser = async ({
  userId,
  title,
  body,
  category = 'system',
  type = 'ALERT',
  imageUrl = '',
  data = {},
  saveHistory = true,
  saveInApp = true,
}) => {
  try {
    let user;
    if (typeof userId === 'object' && userId._id) {
      user = userId;
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Convert custom data values to string as required by FCM
    const stringData = {
      category: String(category),
      type: String(type),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };
    for (const [key, val] of Object.entries(data || {})) {
      stringData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
    }

    let fcmMessageId = null;
    let deliveryStatus = 'pending';
    let errorMessage = '';

    const hasValidToken = validateToken(user.fcmToken);

    if (messagingInstance && hasValidToken) {
      const message = {
        token: user.fcmToken.trim(),
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'kosmico_health_alerts',
            sound: 'default',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      try {
        fcmMessageId = await messagingInstance.send(message);
        deliveryStatus = 'sent';
      } catch (err) {
        console.error(`❌ [FCM] Send error for user ${user._id}:`, err.message);
        deliveryStatus = 'failed';
        errorMessage = err.message;
      }
    } else {
      deliveryStatus = hasValidToken ? 'pending' : 'failed';
      if (!hasValidToken) {
        errorMessage = 'No valid FCM token registered for user';
      }
    }

    // Save In-App notification
    if (saveInApp) {
      try {
        await Notification.create({
          user: user._id,
          title,
          message: body,
          imageUrl: imageUrl || '',
          data: { ...stringData, category, type },
          isRead: false,
        });
      } catch (err) {
        console.error('Error saving in-app notification:', err.message);
      }
    }

    // Save to NotificationHistory
    let historyRecord = null;
    if (saveHistory) {
      try {
        historyRecord = await NotificationHistory.create({
          user: user._id,
          title,
          body,
          category,
          type,
          deliveryStatus,
          channel: hasValidToken ? 'both' : 'in_app',
          fcmMessageId: fcmMessageId || '',
          imageUrl: imageUrl || '',
          data: stringData,
          error: errorMessage,
        });
      } catch (err) {
        console.error('Error saving notification history:', err.message);
      }
    }

    return {
      success: deliveryStatus === 'sent' || (saveInApp && !errorMessage),
      fcmMessageId,
      deliveryStatus,
      historyId: historyRecord?._id,
      error: errorMessage || null,
    };
  } catch (error) {
    console.error('❌ [FCM Service sendToUser Error]:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to multiple tokens (multicast)
 * @param {Object} options
 * @param {string[]} options.tokens - Array of FCM device tokens
 * @param {string} options.title - Title
 * @param {string} options.body - Body message
 * @param {string} [options.category='system'] - Category
 * @param {string} [options.imageUrl] - Image URL
 * @param {Object} [options.data={}] - Custom data payload
 * @returns {Promise<Object>}
 */
export const sendMulticast = async ({
  tokens = [],
  title,
  body,
  category = 'system',
  imageUrl = '',
  data = {},
}) => {
  const validTokens = (tokens || []).filter(validateToken);
  if (!messagingInstance || validTokens.length === 0) {
    return {
      success: false,
      message: 'No valid tokens or Firebase not initialized',
      totalTokens: tokens.length,
      validTokens: validTokens.length,
    };
  }

  const stringData = {
    category: String(category),
    click_action: 'FLUTTER_NOTIFICATION_CLICK',
  };
  for (const [k, v] of Object.entries(data || {})) {
    stringData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  const chunkSize = 500;
  let successCount = 0;
  let failureCount = 0;
  const responses = [];

  for (let i = 0; i < validTokens.length; i += chunkSize) {
    const chunk = validTokens.slice(i, i + chunkSize);
    const message = {
      tokens: chunk,
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'kosmico_health_alerts',
          sound: 'default',
        },
      },
    };

    try {
      const response = await messagingInstance.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;
      responses.push(...response.responses);
    } catch (err) {
      console.error('❌ [FCM Multicast Chunk Error]:', err.message);
      failureCount += chunk.length;
    }
  }

  return {
    success: successCount > 0,
    totalTokens: validTokens.length,
    successCount,
    failureCount,
  };
};

/**
 * Send topic-based push message (e.g. topic: 'all_users', 'health_tips', 'glucose_subscribers')
 * @param {Object} options
 * @param {string} options.topic - Topic name
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string} [options.imageUrl] - Image URL
 * @param {Object} [options.data={}] - Custom data payload
 * @returns {Promise<Object>}
 */
export const sendToTopic = async ({
  topic,
  title,
  body,
  imageUrl = '',
  data = {},
}) => {
  if (!messagingInstance || !topic) {
    return { success: false, message: 'Firebase not initialized or missing topic' };
  }

  const cleanTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '_');

  const stringData = {
    topic: cleanTopic,
    click_action: 'FLUTTER_NOTIFICATION_CLICK',
  };
  for (const [k, v] of Object.entries(data || {})) {
    stringData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  const message = {
    topic: cleanTopic,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: stringData,
    android: {
      priority: 'high',
      notification: {
        channelId: 'kosmico_health_alerts',
      },
    },
  };

  try {
    const messageId = await messagingInstance.send(message);
    return { success: true, messageId, topic: cleanTopic };
  } catch (error) {
    console.error(`❌ [FCM Topic Error for ${cleanTopic}]:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send silent background data message (data-only, no visual notification)
 * Triggers background work/sync on client devices without ringing a bell
 * @param {string} token - FCM Device token
 * @param {Object} data - Key-value data map
 * @returns {Promise<Object>}
 */
export const sendSilentDataMessage = async (token, data = {}) => {
  if (!messagingInstance || !validateToken(token)) {
    return { success: false, message: 'Invalid token or Firebase not configured' };
  }

  const stringData = { silent: 'true' };
  for (const [k, v] of Object.entries(data || {})) {
    stringData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  const message = {
    token: token.trim(),
    data: stringData,
    android: {
      priority: 'normal',
    },
    apns: {
      headers: {
        'apns-push-type': 'background',
        'apns-priority': '5',
      },
      payload: {
        aps: {
          'content-available': 1,
        },
      },
    },
  };

  try {
    const messageId = await messagingInstance.send(message);
    return { success: true, messageId, isSilent: true };
  } catch (error) {
    console.error('❌ [FCM Silent Data Error]:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe device token to a topic
 * @param {string|string[]} tokens
 * @param {string} topic
 */
export const subscribeToTopic = async (tokens, topic) => {
  if (!messagingInstance) return { success: false, message: 'Firebase not ready' };
  const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
  const valid = tokenArray.filter(validateToken);
  if (valid.length === 0) return { success: false, message: 'No valid tokens' };

  try {
    const res = await messagingInstance.subscribeToTopic(valid, topic);
    return { success: true, ...res };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export default {
  validateToken,
  sendToUser,
  sendMulticast,
  sendToTopic,
  sendSilentDataMessage,
  subscribeToTopic,
};
