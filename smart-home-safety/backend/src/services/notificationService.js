/**
 * Firebase Cloud Messaging (FCM) Notification Service
 */

const { messaging, db } = require('../config/firebase');

class NotificationService {
  /**
   * Sends high-priority emergency push notification to all devices belonging to a house.
   */
  static async sendEmergencyAlert({ houseId, alertId, title, message, severity, incidentType }) {
    try {
      // Find all registered FCM tokens for members of this house
      const houseDoc = await db.collection('houses').doc(houseId).get();
      if (!houseDoc.exists) return { sentCount: 0 };

      const houseData = houseDoc.data();
      const memberIds = [houseData.ownerId, ...(houseData.memberIds || [])].filter(Boolean);

      const tokens = [];
      for (const uid of memberIds) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (Array.isArray(userData.fcmTokens)) {
            tokens.push(...userData.fcmTokens);
          }
        }
      }

      if (tokens.length === 0) {
        console.log(`[NotificationService] No registered FCM tokens found for house ${houseId}. Alert logged.`);
        return { sentCount: 0 };
      }

      const payload = {
        notification: {
          title: `⚠️ ${title}`,
          body: message
        },
        data: {
          alertId: String(alertId),
          houseId: String(houseId),
          severity: String(severity),
          incidentType: String(incidentType),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          screen: 'EmergencyResponseScreen'
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'emergency_alerts',
            sound: 'emergency_siren.mp3',
            priority: 'max',
            vibrateTimingsMillis: [0, 500, 200, 500]
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'emergency_siren.aiff',
              'content-available': 1
            }
          }
        }
      };

      if (messaging.sendEachForMulticast) {
        const response = await messaging.sendEachForMulticast({ ...payload, tokens });
        console.log(`[NotificationService] FCM alert dispatched: ${response.successCount} succeeded, ${response.failureCount} failed.`);
        return { sentCount: response.successCount };
      } else {
        const response = await messaging.send({ ...payload, token: tokens[0] });
        return { sentCount: 1, messageId: response };
      }
    } catch (error) {
      console.error('[NotificationService] Error sending emergency push notification:', error.message);
      return { sentCount: 0, error: error.message };
    }
  }
}

module.exports = NotificationService;
