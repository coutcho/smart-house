/**
 * Sensor Watchdog & Health Monitoring Service
 * 
 * Periodically verifies that registered sensors are reporting timely heartbeats.
 * Automatically flags stale sensors as offline and generates safety alerts.
 */

const { db, FieldValue } = require('../config/firebase');
const { WATCHDOG_CONFIG } = require('../config/thresholds');
const NotificationService = require('./notificationService');
const EmergencyResponseEngine = require('./emergencyEngine');

class WatchdogService {
  constructor() {
    this.timer = null;
  }

  start(intervalMs = 15000) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.checkSensorsHealth(), intervalMs);
    console.log(`[WatchdogService] Heartbeat watchdog monitoring started (Interval: ${intervalMs}ms).`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkSensorsHealth() {
    try {
      const now = Date.now();
      const sensorsSnap = await db.collection('sensors').get();
      if (sensorsSnap.empty) return;

      for (const doc of sensorsSnap.docs) {
        const sensor = doc.data();
        if (!sensor.lastHeartbeat) continue;

        const lastHeartbeatTime = new Date(sensor.lastHeartbeat).getTime();
        const elapsedSec = Math.floor((now - lastHeartbeatTime) / 1000);

        if (elapsedSec > WATCHDOG_CONFIG.offlineTimeoutSec && sensor.isOnline !== false) {
          console.warn(`[Watchdog] Sensor ${sensor.sensorId} (${sensor.type} in ${sensor.location}) is OFFLINE (${elapsedSec}s elapsed).`);

          // Mark sensor offline
          await db.collection('sensors').doc(sensor.sensorId).update({
            isOnline: false,
            status: 'offline',
            updatedAt: FieldValue.serverTimestamp()
          });

          // Check if an offline alert already exists
          const existingAlerts = await db.collection('alerts')
            .where('sensorId', '==', sensor.sensorId)
            .where('status', '==', 'active')
            .where('sensorType', '==', 'sensor_offline')
            .get();

          if (existingAlerts.empty) {
            const alertRef = await db.collection('alerts').add({
              houseId: sensor.houseId,
              sensorId: sensor.sensorId,
              sensorType: 'sensor_offline',
              location: sensor.location,
              severity: 'warning',
              status: 'active',
              title: `Sensor Offline: ${sensor.type.toUpperCase()} in ${sensor.location}`,
              triggerValue: elapsedSec,
              unit: 'seconds_stale',
              createdAt: FieldValue.serverTimestamp()
            });

            const plan = EmergencyResponseEngine.generatePlan({
              incidentType: 'sensor_offline',
              severity: 'warning',
              value: elapsedSec,
              unit: 'sec',
              location: sensor.location,
              houseId: sensor.houseId,
              alertId: alertRef.id
            });

            await db.collection('emergencyResponses').doc(alertRef.id).set(plan);

            await NotificationService.sendEmergencyAlert({
              houseId: sensor.houseId,
              alertId: alertRef.id,
              title: `Sensor Disconnection Alert`,
              message: `The ${sensor.type} sensor in ${sensor.location} has stopped responding.`,
              severity: 'warning',
              incidentType: 'sensor_offline'
            });
          }
        }
      }
    } catch (err) {
      console.error('[WatchdogService] Error executing sensor health check:', err.message);
    }
  }
}

module.exports = new WatchdogService();
