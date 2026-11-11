/**
 * End-to-End System Scenario Verification Test Suite
 * Tests all 8 required project scenarios:
 * 1. Normal sensor operation
 * 2. Gas leakage incident
 * 3. Fire detection
 * 4. High temperature
 * 5. Water leakage
 * 6. Sensor disconnection
 * 7. Notification delivery
 * 8. Simulated smart device actions
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const { app, seedInitialData } = require('../backend/src/server');
const { db } = require('../backend/src/config/firebase');
const watchdogService = require('../backend/src/services/watchdogService');
const NotificationService = require('../backend/src/services/notificationService');

describe('Full 8-Scenario System Verification Suite', () => {

  let server;
  let serverPort;
  let baseUrl;
  const apiKey = 'smart_home_sensor_secret_key_2026';
  const houseId = 'HOUSE_001';
  let homeownerToken = 'mock_user_USER_PRIMARY_01';

  before(async () => {
    await seedInitialData();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        baseUrl = `http://127.0.0.1:${serverPort}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  // Helper for HTTP requests
  async function apiRequest(endpoint, method = 'GET', body = null, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${homeownerToken}`,
      ...headers
    };
    const options = {
      method,
      headers: defaultHeaders
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }

  // Helper for sensor simulator posting
  async function postSensorReading(reading) {
    const res = await fetch(`${baseUrl}/sensors/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sensor-API-Key': apiKey
      },
      body: JSON.stringify(reading)
    });
    return { status: res.status, data: await res.json() };
  }

  // =========================================================================
  // SCENARIO 1: Normal Sensor Operation
  // =========================================================================
  test('Scenario 1: Normal Sensor Operation (Ambient Readings & Green Safety State)', async () => {
    const normalReadings = [
      { sensorId: 'SENS_GAS_01', houseId, type: 'gas', value: 14.2, unit: 'ppm', location: 'Kitchen' },
      { sensorId: 'SENS_SMOKE_01', houseId, type: 'smoke', value: 2.3, unit: 'obscuration_index', location: 'Living Room' },
      { sensorId: 'SENS_TEMP_01', houseId, type: 'temperature', value: 21.8, unit: '°C', location: 'Boiler Room' },
      { sensorId: 'SENS_WATER_01', houseId, type: 'water', value: 0.0, unit: 'conductivity', location: 'Basement' }
    ];

    for (const reading of normalReadings) {
      const { status, data } = await postSensorReading(reading);
      assert.equal(status, 201);
      assert.equal(data.severity, 'normal');
      assert.equal(data.alertGenerated, false);
    }

    const { status, data: dash } = await apiRequest(`/houses/${houseId}/dashboard`);
    assert.equal(status, 200);
    assert.equal(dash.overallSafety, 'NORMAL');
    assert.equal(dash.activeAlertsCount, 0);
  });

  // =========================================================================
  // SCENARIO 2: Gas Leakage Incident
  // =========================================================================
  test('Scenario 2: Gas Leakage Incident (Evacuation, Spark Warnings, SOS 14/3303, Gas Shutoff)', async () => {
    const gasEmergency = {
      sensorId: 'SENS_GAS_01',
      houseId,
      type: 'gas',
      value: 620.0,
      unit: 'ppm',
      location: 'Kitchen / Range Area'
    };

    const { status, data: ingest } = await postSensorReading(gasEmergency);
    assert.equal(status, 201);
    assert.equal(ingest.severity, 'critical');
    assert.equal(ingest.alertGenerated, true);
    assert.ok(ingest.alertId);
    assert.ok(ingest.automatedActionTaken, 'Automated gas valve shutoff must execute');

    const alertId = ingest.alertId;

    // Check emergency response plan
    const { status: planStatus, data: planRes } = await apiRequest(`/alerts/${alertId}/response`);
    assert.equal(planStatus, 200);
    const plan = planRes.responsePlan;

    assert.equal(plan.evacuationRequired, true);
    assert.match(plan.title, /CRITICAL GAS LEAKAGE DETECTED/i);

    // Verify strict life safety warnings: NO electrical switches, NO powered ventilation
    const warnings = plan.safetyWarnings.join(' ');
    assert.match(warnings, /DO NOT operate ANY light switches/i);
    assert.match(warnings, /NEVER attempt to operate powered ventilation/i);
    assert.match(warnings, /DO NOT delay evacuation to open windows/i);

    // Verify Algerian Emergency Speed Dial: 14 (Protection Civile) and 3303 (Sonelgaz)
    const contacts = plan.emergencyContacts.map(c => c.number);
    assert.ok(contacts.includes('14'), 'SOS 14 must be present');
    assert.ok(contacts.includes('3303'), 'Sonelgaz 3303 must be present');

    // Verify Gas Valve is now shut in devices collection
    const valveSnap = await db.collection('devices').doc('DEV_GAS_VALVE_01').get();
    assert.equal(valveSnap.data().state.valveOpen, false);

    // Acknowledge and resolve
    await apiRequest(`/alerts/${alertId}/acknowledge`, 'POST');
    await apiRequest(`/alerts/${alertId}/resolve`, 'POST', { resolutionNotes: 'Area ventilated, stove shut, cleared safe.' });
  });

  // =========================================================================
  // SCENARIO 3: Fire & Smoke Detection
  // =========================================================================
  test('Scenario 3: Fire & Smoke Detection (Evacuation Priority, SOS 14, Egress Pathway Lighting)', async () => {
    const fireEmergency = {
      sensorId: 'SENS_SMOKE_01',
      houseId,
      type: 'smoke',
      value: 260.0,
      unit: 'obscuration_index',
      location: 'Living Room Ceiling'
    };

    const { status, data: ingest } = await postSensorReading(fireEmergency);
    assert.equal(status, 201);
    assert.equal(ingest.severity, 'critical');
    assert.ok(ingest.alertId);

    const alertId = ingest.alertId;

    // Check plan
    const { data: planRes } = await apiRequest(`/alerts/${alertId}/response`);
    const plan = planRes.responsePlan;

    assert.equal(plan.evacuationRequired, true);
    assert.match(plan.title, /FIRE & SMOKE EMERGENCY/i);

    // Verify safety rules: Crawl low, Feel doors, Never delay evacuation
    const instructions = plan.instructions.map(i => i.text).join(' ');
    assert.match(instructions, /CRAWL LOW under smoke/i);
    assert.match(instructions, /FEEL DOORS/i);
    assert.match(instructions, /call 14 \(Protection Civile\)/i);

    // Execute Smart Egress Lighting Action
    const { status: lightStatus, data: lightAction } = await apiRequest('/devices/DEV_LIGHT_01/actions', 'POST', {
      houseId,
      actionType: 'turn_on_lights'
    });
    assert.equal(lightStatus, 200);
    assert.equal(lightAction.confirmed, true);
    assert.equal(lightAction.deviceState.lightOn, true);

    // Resolve alert
    await apiRequest(`/alerts/${alertId}/resolve`, 'POST', { resolutionNotes: 'False alarm smoke cleared.' });
  });

  // =========================================================================
  // SCENARIO 4: High Temperature Incident
  // =========================================================================
  test('Scenario 4: High Temperature Incident (Furnace Anomaly & Thermostat Setback)', async () => {
    const tempEmergency = {
      sensorId: 'SENS_TEMP_01',
      houseId,
      type: 'temperature',
      value: 52.5,
      unit: '°C',
      location: 'Boiler / Utility Room'
    };

    const { status, data: ingest } = await postSensorReading(tempEmergency);
    assert.equal(status, 201);
    assert.equal(ingest.severity, 'critical');
    assert.ok(ingest.alertId);

    const alertId = ingest.alertId;

    // Plan check
    const { data: planRes } = await apiRequest(`/alerts/${alertId}/response`);
    const plan = planRes.responsePlan;
    assert.match(plan.title, /CRITICAL HIGH TEMPERATURE/i);

    // Execute Thermostat Setback / Cutoff
    const { status: heatStatus, data: heatAction } = await apiRequest('/devices/DEV_THERMOSTAT_01/actions', 'POST', {
      houseId,
      actionType: 'set_temperature',
      parameters: { targetTemp: 16.0, heatingOn: false }
    });
    assert.equal(heatStatus, 200);
    assert.equal(heatAction.confirmed, true);
    assert.equal(heatAction.deviceState.heatingOn, false);
    assert.equal(heatAction.deviceState.targetTemp, 16.0);

    // Resolve alert
    await apiRequest(`/alerts/${alertId}/resolve`, 'POST', { resolutionNotes: 'Boiler inspected and thermostat reset.' });
  });

  // =========================================================================
  // SCENARIO 5: Water Leakage / Flood Incident
  // =========================================================================
  test('Scenario 5: Water Leakage Incident (Electrical Hazard Warning & Water Valve Shutoff)', async () => {
    const waterEmergency = {
      sensorId: 'SENS_WATER_01',
      houseId,
      type: 'water',
      value: 0.95,
      unit: 'conductivity',
      location: 'Basement Water Heater'
    };

    const { status, data: ingest } = await postSensorReading(waterEmergency);
    assert.equal(status, 201);
    assert.equal(ingest.severity, 'critical');
    assert.ok(ingest.alertId);
    assert.ok(ingest.automatedActionTaken, 'Automated water shutoff must execute');

    const alertId = ingest.alertId;

    // Plan check
    const { data: planRes } = await apiRequest(`/alerts/${alertId}/response`);
    const plan = planRes.responsePlan;
    assert.match(plan.title, /CRITICAL WATER LEAK/i);

    // Shock warnings
    const warnings = plan.safetyWarnings.join(' ');
    assert.match(warnings, /DO NOT step into standing water/i);
    assert.match(warnings, /electric shock/i);

    // Verify Water Valve is closed
    const valveSnap = await db.collection('devices').doc('DEV_WATER_VALVE_01').get();
    assert.equal(valveSnap.data().state.valveOpen, false);

    // Resolve alert
    await apiRequest(`/alerts/${alertId}/resolve`, 'POST', { resolutionNotes: 'Heater pipe valve sealed.' });
  });

  // =========================================================================
  // SCENARIO 6: Sensor Disconnection (Heartbeat Watchdog)
  // =========================================================================
  test('Scenario 6: Sensor Disconnection & Watchdog Alert Generation', async () => {
    const testSensorId = 'SENS_DISCONNECT_TEST';
    
    // Seed sensor with expired heartbeat (>120 seconds ago)
    const staleTime = new Date(Date.now() - 150 * 1000).toISOString();
    await db.collection('sensors').doc(testSensorId).set({
      sensorId: testSensorId,
      houseId,
      type: 'gas',
      location: 'Attic Space',
      isOnline: true,
      status: 'normal',
      lastHeartbeat: staleTime
    });

    // Trigger watchdog check
    await watchdogService.checkSensorsHealth();

    // Verify sensor is marked offline
    const sensorSnap = await db.collection('sensors').doc(testSensorId).get();
    assert.equal(sensorSnap.data().isOnline, false);
    assert.equal(sensorSnap.data().status, 'offline');

    // Verify disconnection alert was generated
    const alertsSnap = await db.collection('alerts')
      .where('sensorId', '==', testSensorId)
      .where('sensorType', '==', 'sensor_offline')
      .get();
    assert.equal(alertsSnap.empty, false);

    // Reconnection: Simulator sends heartbeat -> sensor restored
    const hbRes = await fetch(`${baseUrl}/sensors/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sensor-API-Key': apiKey
      },
      body: JSON.stringify({
        sensorId: testSensorId,
        houseId,
        type: 'gas',
        location: 'Attic Space',
        batteryLevel: 94
      })
    });
    assert.equal(hbRes.status, 200);

    const reconnectedSnap = await db.collection('sensors').doc(testSensorId).get();
    assert.equal(reconnectedSnap.data().isOnline, true);
  });

  // =========================================================================
  // SCENARIO 7: Notification Delivery (FCM Push Service)
  // =========================================================================
  test('Scenario 7: Notification Delivery (Token Registration & Priority FCM Multicast)', async () => {
    // 1. User registers FCM token
    const tokenRes = await apiRequest('/houses/users/fcm-token', 'POST', {
      fcmToken: 'fcm_token_device_pixel_9_dz_2026',
      houseId
    });
    assert.equal(tokenRes.status, 200);

    // 2. Dispatch emergency alert via NotificationService
    const notifResult = await NotificationService.sendEmergencyAlert({
      houseId,
      alertId: 'ALERT_FCM_TEST',
      title: 'CRITICAL GAS LEAKAGE DETECTED',
      message: 'Evacuate immediately. Call 14 (Protection Civile).',
      severity: 'critical',
      incidentType: 'gas'
    });

    assert.equal(notifResult.sentCount >= 1, true);
  });

  // =========================================================================
  // SCENARIO 8: Simulated Smart Device Actions & Immutable Audit Logging
  // =========================================================================
  test('Scenario 8: Simulated Smart Device Actions, Safety Interlocks & Audit Trail', async () => {
    // 1. Test Safety Interlock: Reopening gas valve while active critical gas leak is blocked
    const alertRef = await db.collection('alerts').add({
      houseId,
      sensorId: 'SENS_GAS_01',
      sensorType: 'gas',
      severity: 'critical',
      status: 'active',
      title: 'Active Gas Emergency Interlock Test',
      createdAt: new Date().toISOString()
    });

    const interlockAttempt = await apiRequest('/devices/DEV_GAS_VALVE_01/actions', 'POST', {
      houseId,
      actionType: 'open_gas'
    });
    assert.equal(interlockAttempt.status, 400);
    assert.match(interlockAttempt.data.error, /SAFETY INTERLOCK/i);

    // Clean up test alert
    await alertRef.update({ status: 'resolved' });

    // 2. Test Authorized Action Execution
    const executeRes = await apiRequest('/devices/DEV_WATER_VALVE_01/actions', 'POST', {
      houseId,
      actionType: 'shutoff_water'
    });
    assert.equal(executeRes.status, 200);
    assert.equal(executeRes.data.confirmed, true);
    assert.ok(executeRes.data.actionId);
    assert.ok(executeRes.data.executionDurationMs >= 100);

    // 3. Verify Immutable Audit Record in deviceActions collection
    const actionAuditSnap = await db.collection('deviceActions').doc(executeRes.data.actionId).get();
    assert.equal(actionAuditSnap.exists, true);
    const auditData = actionAuditSnap.data();
    assert.equal(auditData.status, 'confirmed');
    assert.equal(auditData.actionType, 'shutoff_water');
    assert.equal(auditData.deviceId, 'DEV_WATER_VALVE_01');
    assert.ok(auditData.timestamp);
    assert.ok(auditData.completedAt);

    // 4. Query Device Action History Endpoint
    const historyRes = await apiRequest('/devices/DEV_WATER_VALVE_01/actions/history');
    assert.equal(historyRes.status, 200);
    assert.ok(historyRes.data.history.length >= 1);
  });
});
