/**
 * Sensor Controller
 * 
 * Ingests incoming sensor telemetry, updates sensor registry, evaluates safety thresholds,
 * creates alerts, triggers automated responses, and logs time-series data.
 */

const { db, FieldValue } = require('../config/firebase');
const EmergencyResponseEngine = require('../services/emergencyEngine');
const NotificationService = require('../services/notificationService');
const DeviceOrchestrator = require('../services/deviceOrchestrator');

class SensorController {
  /**
   * POST /api/v1/sensors/readings
   */
  static async postReading(req, res) {
    try {
      const {
        sensorId,
        houseId,
        type,
        value,
        unit,
        location = 'General Area',
        batteryLevel = 100
      } = req.body;

      const now = FieldValue.serverTimestamp();

      // 1. Evaluate safety threshold
      const { severity, threshold } = EmergencyResponseEngine.evaluateSeverity(type, value);

      // 2. Persist time-series telemetry reading
      const readingRef = await db.collection('sensorReadings').add({
        sensorId,
        houseId,
        type,
        value,
        unit,
        location,
        severity,
        timestamp: now
      });

      // 3. Update Sensor registry state
      const sensorRef = db.collection('sensors').doc(sensorId);
      await sensorRef.set({
        sensorId,
        houseId,
        type,
        location,
        lastValue: value,
        unit,
        batteryLevel,
        status: severity,
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
        updatedAt: now
      }, { merge: true });

      let createdAlertId = null;
      let automatedActionTaken = null;

      // 4. Alert Workflow if threshold is breached (warning or critical)
      if (severity === 'warning' || severity === 'critical') {
        // Check if there is already an active alert for this sensor
        const existingAlerts = await db.collection('alerts')
          .where('sensorId', '==', sensorId)
          .where('status', '==', 'active')
          .get();

        if (existingAlerts.empty) {
          const alertDoc = {
            houseId,
            sensorId,
            sensorType: type,
            location,
            severity,
            status: 'active',
            triggerValue: value,
            thresholdValue: severity === 'critical' ? threshold.emergencyThreshold : threshold.warningThreshold,
            unit,
            title: `${severity.toUpperCase()}: ${threshold.name} in ${location}`,
            createdAt: now,
            acknowledgedAt: null,
            resolvedAt: null
          };

          const alertRef = await db.collection('alerts').add(alertDoc);
          createdAlertId = alertRef.id;

          // Generate dynamic emergency response plan
          const plan = EmergencyResponseEngine.generatePlan({
            incidentType: type,
            severity,
            value,
            unit,
            location,
            houseId,
            alertId: createdAlertId
          });

          await db.collection('emergencyResponses').doc(createdAlertId).set(plan);

          // Dispatch High-Priority Push Notification
          await NotificationService.sendEmergencyAlert({
            houseId,
            alertId: createdAlertId,
            title: alertDoc.title,
            message: plan.headline,
            severity,
            incidentType: type
          });

          // 5. Automated Smart Device Safety Action (if configured and critical)
          if (severity === 'critical') {
            const houseSnap = await db.collection('houses').doc(houseId).get();
            const houseData = houseSnap.exists ? houseSnap.data() : {};
            const emergencySettings = houseData.emergencySettings || {
              autoShutoffGasOnEmergency: true,
              autoShutoffWaterOnEmergency: true
            };

            // Automated Gas Shutoff
            if (type === 'gas' && emergencySettings.autoShutoffGasOnEmergency) {
              const gasValves = await db.collection('devices')
                .where('houseId', '==', houseId)
                .where('type', '==', 'gas_valve')
                .get();

              if (!gasValves.empty) {
                const targetValve = gasValves.docs[0];
                automatedActionTaken = await DeviceOrchestrator.executeAction({
                  houseId,
                  deviceId: targetValve.id,
                  actionType: 'shutoff_gas',
                  requestedBy: 'SYSTEM_AUTOMATION'
                });
                console.log(`[SensorController] Automated emergency gas shutoff executed for ${targetValve.id}`);
              }
            }

            // Automated Water Shutoff
            if (type === 'water' && emergencySettings.autoShutoffWaterOnEmergency) {
              const waterValves = await db.collection('devices')
                .where('houseId', '==', houseId)
                .where('type', '==', 'water_valve')
                .get();

              if (!waterValves.empty) {
                const targetValve = waterValves.docs[0];
                automatedActionTaken = await DeviceOrchestrator.executeAction({
                  houseId,
                  deviceId: targetValve.id,
                  actionType: 'shutoff_water',
                  requestedBy: 'SYSTEM_AUTOMATION'
                });
                console.log(`[SensorController] Automated emergency water shutoff executed for ${targetValve.id}`);
              }
            }
          }
        }
      }

      return res.status(201).json({
        success: true,
        readingId: readingRef.id,
        severity,
        alertGenerated: !!createdAlertId,
        alertId: createdAlertId,
        automatedActionTaken
      });
    } catch (error) {
      console.error('[SensorController] Error in postReading:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/sensors/heartbeat
   */
  static async heartbeat(req, res) {
    try {
      const { sensorId, houseId, type, location, batteryLevel = 100 } = req.body;

      if (!sensorId) {
        return res.status(400).json({ error: "Missing required 'sensorId'." });
      }

      await db.collection('sensors').doc(sensorId).set({
        sensorId,
        houseId: houseId || 'HOUSE_001',
        type: type || 'unknown',
        location: location || 'General Area',
        batteryLevel,
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('[SensorController] Error in heartbeat:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/sensors
   */
  static async getSensors(req, res) {
    try {
      const houseId = req.query.houseId || 'HOUSE_001';
      const snap = await db.collection('sensors').where('houseId', '==', houseId).get();
      const sensors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ success: true, count: sensors.length, sensors });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SensorController;
