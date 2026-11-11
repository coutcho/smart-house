const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('../src/config/firebase');
const DeviceOrchestrator = require('../src/services/deviceOrchestrator');

describe('Smart Device Orchestrator Tests', () => {

  const houseId = 'HOUSE_TEST_DEV';
  const gasValveId = 'DEV_GAS_VALVE_TEST';

  before(async () => {
    // Seed test device
    await db.collection('devices').doc(gasValveId).set({
      deviceId: gasValveId,
      houseId,
      name: 'Test Gas Valve',
      type: 'gas_valve',
      state: { valveOpen: true },
      isOnline: true
    });
  });

  test('Successfully executes shutoff_gas and updates device state with audit log', async () => {
    const result = await DeviceOrchestrator.executeAction({
      houseId,
      deviceId: gasValveId,
      actionType: 'shutoff_gas',
      requestedBy: 'TEST_USER_01'
    });

    assert.equal(result.confirmed, true);
    assert.equal(result.deviceState.valveOpen, false);
    assert.ok(result.actionId);

    // Verify state persisted in Firestore
    const deviceSnap = await db.collection('devices').doc(gasValveId).get();
    assert.equal(deviceSnap.data().state.valveOpen, false);

    // Verify audit record in deviceActions
    const actionSnap = await db.collection('deviceActions').doc(result.actionId).get();
    assert.equal(actionSnap.exists, true);
    assert.equal(actionSnap.data().status, 'confirmed');
    assert.equal(actionSnap.data().actionType, 'shutoff_gas');
  });

  test('Blocks unsafe action when active critical gas alert exists (Safety Interlock)', async () => {
    // Inject active critical gas alert
    const alertRef = await db.collection('alerts').add({
      houseId,
      sensorId: 'SENS_GAS_CRITICAL_01',
      sensorType: 'gas',
      severity: 'critical',
      status: 'active',
      title: 'Active Gas Emergency',
      createdAt: new Date().toISOString()
    });

    // Attempt to reopen gas valve
    await assert.rejects(
      async () => {
        await DeviceOrchestrator.executeAction({
          houseId,
          deviceId: gasValveId,
          actionType: 'open_gas',
          requestedBy: 'TEST_USER_01'
        });
      },
      /SAFETY INTERLOCK/i
    );

    // Clean up test alert
    await alertRef.update({ status: 'resolved' });
  });
});
