const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const { app, seedInitialData } = require('../../backend/src/server');
const { api } = require('../src/services/api');
const { firebaseAuth } = require('../src/services/firebase');

describe('Mobile App End-to-End Backend Integration Tests', () => {

  let server;
  let serverPort;

  before(async () => {
    await seedInitialData();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        api.setBaseUrl(`http://127.0.0.1:${serverPort}/api/v1`);
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  test('Flow: Homeowner signs in, inspects dashboard, and verifies all 4 environmental sensors', async () => {
    const authRes = await firebaseAuth.signInWithEmailAndPassword('owner@safehome.dz', 'safehome2026');
    const token = await authRes.user.getIdToken();
    api.setAuthToken(token);

    const dashboard = await api.getDashboard('HOUSE_001');
    assert.equal(dashboard.success, true);
    assert.equal(dashboard.overallSafety, 'NORMAL');
    assert.equal(dashboard.sensors.length, 4);
    assert.equal(dashboard.devices.length, 4);

    // Verify all 4 types exist (strictly no cameras, no motion)
    const types = dashboard.sensors.map(s => s.type);
    assert.ok(types.includes('gas'));
    assert.ok(types.includes('smoke'));
    assert.ok(types.includes('temperature'));
    assert.ok(types.includes('water'));
    assert.equal(types.includes('camera'), false);
    assert.equal(types.includes('motion'), false);
  });

  test('Flow: Hazard occurs -> Mobile receives critical alert -> Fetches Algerian SOS plan (14/3303) -> Executes Confirmed Valve Shutoff -> Resolves', async () => {
    // 1. Ingest simulated critical gas reading
    const ingestRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/sensors/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sensor-API-Key': 'smart_home_sensor_secret_key_2026'
      },
      body: JSON.stringify({
        sensorId: 'SENS_GAS_01',
        houseId: 'HOUSE_001',
        type: 'gas',
        value: 580.0,
        unit: 'ppm',
        location: 'Kitchen / Range Area'
      })
    });
    const ingestData = await ingestRes.json();
    assert.equal(ingestData.severity, 'critical');
    assert.ok(ingestData.alertId);

    const alertId = ingestData.alertId;

    // 2. Mobile refreshes dashboard and detects CRITICAL state
    const dashboard = await api.getDashboard('HOUSE_001');
    assert.equal(dashboard.overallSafety, 'CRITICAL');
    assert.equal(dashboard.activeAlertsCount >= 1, true);

    // 3. Mobile fetches dynamic Emergency Response Plan
    const planRes = await api.getEmergencyResponse(alertId);
    assert.equal(planRes.success, true);
    const plan = planRes.responsePlan;
    assert.equal(plan.evacuationRequired, true);

    // Verify Algerian SOS Numbers: Protection Civile 14 and Sonelgaz 3303
    const numbers = plan.emergencyContacts.map(c => c.number);
    assert.ok(numbers.includes('14'));
    assert.ok(numbers.includes('3303'));

    // Verify Strict Gas Safety Warnings
    const warnings = plan.safetyWarnings.join(' ');
    assert.match(warnings, /DO NOT operate ANY light switches/i);
    assert.match(warnings, /NEVER attempt to operate powered ventilation/i);
    assert.match(warnings, /DO NOT delay evacuation to open windows/i);

    // 4. Mobile executes confirmed smart valve shutoff
    const actionResult = await api.executeDeviceAction({
      deviceId: 'DEV_GAS_VALVE_01',
      houseId: 'HOUSE_001',
      actionType: 'shutoff_gas'
    });
    assert.equal(actionResult.confirmed, true);
    assert.equal(actionResult.deviceState.valveOpen, false);
    assert.ok(actionResult.actionId);

    // 5. Mobile user marks alert resolved
    const resolveRes = await api.resolveAlert(alertId, 'Gas burner secured, room cleared, verified safe by Protection Civile 14.');
    assert.equal(resolveRes.success, true);

    // 6. Dashboard returns to NORMAL
    const finalDashboard = await api.getDashboard('HOUSE_001');
    assert.equal(finalDashboard.overallSafety, 'NORMAL');
    assert.equal(finalDashboard.activeAlertsCount, 0);
  });
});
