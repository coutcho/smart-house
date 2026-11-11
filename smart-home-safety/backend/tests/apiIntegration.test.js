const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { app, seedInitialData } = require('../src/server');
const { db } = require('../src/config/firebase');

// Helper to simulate HTTP requests without external network binding
function mockRequest(app, method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const express = require('express');
    const http = require('http');
    const server = http.createServer(app);

    // Pick random available ephemeral port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const parsedUrl = new URL(`http://127.0.0.1:${port}${url}`);

      const reqOptions = {
        hostname: '127.0.0.1',
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(reqOptions, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          server.close();
          let json = null;
          try { json = JSON.parse(responseBody); } catch (_) {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json || responseBody
          });
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

describe('Full Backend API Integration Tests', () => {

  const apiKey = 'smart_home_sensor_secret_key_2026';
  const houseId = 'HOUSE_001';
  const authHeader = { 'Authorization': 'Bearer mock_user_USER_PRIMARY_01' };

  before(async () => {
    await seedInitialData();
  });

  test('GET /api/v1/system/health returns healthy status', async () => {
    const res = await mockRequest(app, 'GET', '/api/v1/system/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ONLINE');
    assert.deepEqual(res.body.monitoredHazards, ['gas', 'smoke', 'temperature', 'water']);
  });

  test('POST /api/v1/sensors/readings fails without valid API key', async () => {
    const res = await mockRequest(app, 'POST', '/api/v1/sensors/readings', {}, {
      sensorId: 'SENS_GAS_01',
      houseId,
      type: 'gas',
      value: 15.0,
      unit: 'ppm'
    });
    assert.equal(res.status, 401);
  });

  test('POST /api/v1/sensors/readings ingests normal reading without triggering alerts', async () => {
    const res = await mockRequest(
      app,
      'POST',
      '/api/v1/sensors/readings',
      { 'X-Sensor-API-Key': apiKey },
      {
        sensorId: 'SENS_TEMP_01',
        houseId,
        type: 'temperature',
        value: 22.5,
        unit: '°C',
        location: 'Boiler / Utility Room'
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.severity, 'normal');
    assert.equal(res.body.alertGenerated, false);
  });

  test('POST /api/v1/sensors/readings ingests CRITICAL GAS reading, creates alert, generates emergency response plan, and executes automated valve shutoff', async () => {
    const res = await mockRequest(
      app,
      'POST',
      '/api/v1/sensors/readings',
      { 'X-Sensor-API-Key': apiKey },
      {
        sensorId: 'SENS_GAS_01',
        houseId,
        type: 'gas',
        value: 480.0,
        unit: 'ppm',
        location: 'Kitchen / Range Area'
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.severity, 'critical');
    assert.equal(res.body.alertGenerated, true);
    assert.ok(res.body.alertId);
    assert.ok(res.body.automatedActionTaken, 'Automated gas shutoff must execute');

    const alertId = res.body.alertId;

    // Check emergency response plan endpoint
    const planRes = await mockRequest(app, 'GET', `/api/v1/alerts/${alertId}/response`, authHeader);
    assert.equal(planRes.status, 200);
    assert.equal(planRes.body.responsePlan.evacuationRequired, true);
    assert.match(planRes.body.responsePlan.title, /CRITICAL GAS LEAKAGE DETECTED/i);

    // Verify Gas Valve is now closed in devices collection
    const valveSnap = await db.collection('devices').doc('DEV_GAS_VALVE_01').get();
    assert.equal(valveSnap.data().state.valveOpen, false);

    // Test Acknowledge Alert
    const ackRes = await mockRequest(app, 'POST', `/api/v1/alerts/${alertId}/acknowledge`, authHeader);
    assert.equal(ackRes.status, 200);

    // Test Resolve Alert
    const resolveRes = await mockRequest(app, 'POST', `/api/v1/alerts/${alertId}/resolve`, authHeader, {
      resolutionNotes: 'Gas stove knob turned off and certified safe.'
    });
    assert.equal(resolveRes.status, 200);
  });

  test('POST /api/v1/sensors/heartbeat successfully updates lastHeartbeat', async () => {
    const res = await mockRequest(
      app,
      'POST',
      '/api/v1/sensors/heartbeat',
      { 'X-Sensor-API-Key': apiKey },
      {
        sensorId: 'SENS_WATER_01',
        houseId,
        type: 'water',
        location: 'Basement Water Heater',
        batteryLevel: 97
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('GET /api/v1/houses/:houseId/dashboard returns consolidated dashboard data', async () => {
    const res = await mockRequest(app, 'GET', `/api/v1/houses/${houseId}/dashboard`, authHeader);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.overallSafety);
    assert.ok(res.body.sensors.length >= 4);
    assert.ok(res.body.devices.length >= 4);
  });

  test('POST /api/v1/devices/:deviceId/actions executes smart water shutoff with backend confirmation', async () => {
    const res = await mockRequest(
      app,
      'POST',
      '/api/v1/devices/DEV_WATER_VALVE_01/actions',
      authHeader,
      {
        houseId,
        actionType: 'shutoff_water'
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.confirmed, true);
    assert.equal(res.body.deviceState.valveOpen, false);
    assert.ok(res.body.actionId);
  });
});
