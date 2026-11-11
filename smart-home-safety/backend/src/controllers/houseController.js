/**
 * House Controller
 * 
 * Provides aggregated dashboard telemetry for instantaneous mobile rendering,
 * and user FCM push token registration.
 */

const { db, FieldValue } = require('../config/firebase');

class HouseController {
  /**
   * GET /api/v1/houses/:houseId/dashboard
   */
  static async getDashboard(req, res) {
    try {
      const { houseId } = req.params;

      // 1. Fetch House record
      const houseSnap = await db.collection('houses').doc(houseId).get();
      const houseData = houseSnap.exists ? houseSnap.data() : { houseId, name: 'Smart Residence' };

      // 2. Fetch Active Alerts
      const alertsSnap = await db.collection('alerts')
        .where('houseId', '==', houseId)
        .where('status', '==', 'active')
        .get();

      const activeAlerts = alertsSnap.docs.map(doc => ({ alertId: doc.id, ...doc.data() }));

      // Determine overall safety state
      let overallSafety = 'NORMAL';
      if (activeAlerts.some(a => a.severity === 'critical')) {
        overallSafety = 'CRITICAL';
      } else if (activeAlerts.some(a => a.severity === 'warning')) {
        overallSafety = 'WARNING';
      }

      // 3. Fetch Sensors
      const sensorsSnap = await db.collection('sensors').where('houseId', '==', houseId).get();
      const sensors = sensorsSnap.docs.map(doc => ({ sensorId: doc.id, ...doc.data() }));

      // 4. Fetch Devices
      const devicesSnap = await db.collection('devices').where('houseId', '==', houseId).get();
      const devices = devicesSnap.docs.map(doc => ({ deviceId: doc.id, ...doc.data() }));

      return res.json({
        success: true,
        house: houseData,
        overallSafety,
        activeAlertsCount: activeAlerts.length,
        activeAlerts,
        sensorsCount: sensors.length,
        sensors,
        devicesCount: devices.length,
        devices
      });
    } catch (error) {
      console.error('[HouseController] Error fetching dashboard:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/users/fcm-token
   */
  static async updateFcmToken(req, res) {
    try {
      const { fcmToken, houseId } = req.body;
      const userId = req.user ? req.user.uid : 'DEMO_USER';

      if (!fcmToken) {
        return res.status(400).json({ error: "Missing required 'fcmToken'." });
      }

      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      let tokens = [];
      if (userSnap.exists && Array.isArray(userSnap.data().fcmTokens)) {
        tokens = userSnap.data().fcmTokens;
      }

      if (!tokens.includes(fcmToken)) {
        tokens.push(fcmToken);
      }

      await userRef.set({
        userId,
        houseId: houseId || 'HOUSE_001',
        fcmTokens: tokens,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return res.json({ success: true, message: 'FCM token registered successfully.' });
    } catch (error) {
      console.error('[HouseController] Error updating FCM token:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = HouseController;
