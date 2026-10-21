import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let messagingInstance = null;

try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    const app = getApps().length === 0 
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];

    messagingInstance = getMessaging(app);
    console.log('🔥 Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
  } else {
    console.warn('⚠️ serviceAccountKey.json not found in src/config/. Push notifications will be skipped.');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
}

/**
 * Send push notification to a single device FCM token
 * @param {Object} params
 * @param {string} params.token - FCM Device Token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} [params.imageUrl] - Big picture image url
 * @param {Object} [params.data] - Custom data key-values (screen, id, etc.)
 */
export const sendPushNotification = async ({ token, title, body, imageUrl, data = {} }) => {
  if (!messagingInstance || !token) {
    return { success: false, message: 'Firebase messaging not initialized or missing token' };
  }

  // Ensure all data values are strings (FCM requirement)
  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  const message = {
    token,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      ...stringData,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'kosmico_high_importance',
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
    const response = await messagingInstance.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Failed to send FCM message:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to multiple device tokens (broadcast)
 * @param {Object} params
 * @param {string[]} params.tokens - Array of FCM Device Tokens
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} [params.imageUrl] - Big picture image url
 * @param {Object} [params.data] - Custom data key-values
 */
export const sendMulticastNotification = async ({ tokens, title, body, imageUrl, data = {} }) => {
  if (!messagingInstance || !tokens || tokens.length === 0) {
    return { success: false, message: 'Firebase messaging not initialized or empty tokens' };
  }

  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  const message = {
    tokens,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      ...stringData,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'kosmico_high_importance',
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
    const response = await messagingInstance.sendEachForMulticast(message);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error('❌ Failed to send Multicast FCM:', error.message);
    return { success: false, error: error.message };
  }
};

export default messagingInstance;
