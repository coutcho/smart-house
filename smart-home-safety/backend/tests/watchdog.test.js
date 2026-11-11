const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('../src/config/firebase');
const watchdogService = require('../src/services/watchdogService');
const { WATCHDOG_CONFIG } = require('../src/config/thresholds');

describe('Watchdog Service Tests', () => {

  test('Flags sensor as offline and generates alert if last heartbeat exceeded timeout', async () => {
    const sensorId = 'SENS_WATCHDOG_TEST';
    const houseId = 'HOUSE_001';

    // Seed a sensor with an old heartbeat (3 minutes ago)
    const staleHeartbeatTime = new Date(Date.now() - 180 * 1000).toISOString();
    await db.collection('sensors').doc(sensorId).set({
      sensorId,
      houseId,
      type: 'gas',
      location: 'Attic',
      isOnline: true,
      status: 'normal',
      lastHeartbeat: staleHeartbeatTime
    });

    // Run watchdog check
    await watchdogService.checkSensorsHealth();

    // Verify sensor is now flagged offline
    const updatedSensor = await db.collection('sensors').doc(sensorId).get();
    assert.equal(updatedSensor.data().isOnline, false);
    assert.equal(updatedSensor.data().status, 'offline');

    // Verify an offline alert was created
    const alertsSnap = await db.collection('alerts')
      .where('sensorId', '==', sensorId)
      .where('status', '==', 'active')
      .where('sensorType', '==', 'sensor_offline')
      .get();

    assert.equal(alertsSnap.empty, false);
    assert.match(alertsSnap.docs[0].data().title, /Sensor Offline/i);
  });
});
