const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const EmergencyResponseEngine = require('../src/services/emergencyEngine');

describe('Emergency Response Engine (ERE) Tests', () => {

  test('Correctly classifies thresholds across all environmental sensors', () => {
    // Gas thresholds (Warning >= 100, Emergency >= 400)
    assert.equal(EmergencyResponseEngine.evaluateSeverity('gas', 15.0).severity, 'normal');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('gas', 120.0).severity, 'warning');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('gas', 450.0).severity, 'critical');

    // Smoke thresholds (Warning >= 50, Emergency >= 150)
    assert.equal(EmergencyResponseEngine.evaluateSeverity('smoke', 5.0).severity, 'normal');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('smoke', 60.0).severity, 'warning');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('smoke', 180.0).severity, 'critical');

    // Temperature thresholds (Warning >= 38, Emergency >= 48)
    assert.equal(EmergencyResponseEngine.evaluateSeverity('temperature', 22.0).severity, 'normal');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('temperature', 40.0).severity, 'warning');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('temperature', 52.0).severity, 'critical');

    // Water thresholds (Warning >= 0.3, Emergency >= 0.7)
    assert.equal(EmergencyResponseEngine.evaluateSeverity('water', 0.0).severity, 'normal');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('water', 0.4).severity, 'warning');
    assert.equal(EmergencyResponseEngine.evaluateSeverity('water', 0.85).severity, 'critical');
  });

  test('Gas Leak Plan enforces strict evacuation and prohibits electrical switch / powered fan operation', () => {
    const plan = EmergencyResponseEngine.generatePlan({
      incidentType: 'gas',
      severity: 'critical',
      value: 500.0,
      unit: 'ppm',
      location: 'Kitchen',
      houseId: 'HOUSE_001',
      alertId: 'ALERT_GAS_TEST'
    });

    assert.equal(plan.evacuationRequired, true);
    assert.match(plan.title, /CRITICAL GAS LEAKAGE DETECTED/i);

    // Verify critical safety warnings
    const warningsJoined = plan.safetyWarnings.join(' ');
    assert.match(warningsJoined, /DO NOT operate ANY light switches/i);
    assert.match(warningsJoined, /NEVER attempt to operate powered ventilation/i);
    assert.match(warningsJoined, /DO NOT delay evacuation to open windows/i);

    // Verify remote gas valve shutoff action is available
    const shutoffAction = plan.availableActions.find(a => a.actionType === 'shutoff_gas');
    assert.ok(shutoffAction, 'Gas shutoff action must be offered');
  });

  test('Fire / Smoke Plan strictly prioritizes evacuation without delaying actions', () => {
    const plan = EmergencyResponseEngine.generatePlan({
      incidentType: 'smoke',
      severity: 'critical',
      value: 200.0,
      unit: 'obscuration_index',
      location: 'Living Room',
      houseId: 'HOUSE_001',
      alertId: 'ALERT_SMOKE_TEST'
    });

    assert.equal(plan.evacuationRequired, true);
    assert.match(plan.title, /FIRE & SMOKE EMERGENCY/i);

    const instructionsJoined = plan.instructions.map(i => i.text).join(' ');
    assert.match(instructionsJoined, /EVACUATE IMMEDIATELY/i);
    assert.match(instructionsJoined, /CRAWL LOW under smoke/i);

    // Never delay evacuation
    const warningsJoined = plan.safetyWarnings.join(' ');
    assert.match(warningsJoined, /DO NOT delay evacuation/i);
  });

  test('Water Leak Plan includes electrical warning and water shutoff action', () => {
    const plan = EmergencyResponseEngine.generatePlan({
      incidentType: 'water',
      severity: 'critical',
      value: 0.9,
      unit: 'conductivity',
      location: 'Basement',
      houseId: 'HOUSE_001',
      alertId: 'ALERT_WATER_TEST'
    });

    const warningsJoined = plan.safetyWarnings.join(' ');
    assert.match(warningsJoined, /DO NOT step into standing water/i);
    assert.match(warningsJoined, /electric shock/i);

    const waterAction = plan.availableActions.find(a => a.actionType === 'shutoff_water');
    assert.ok(waterAction, 'Water valve shutoff action must be offered');
  });

  test('High Temperature Plan offers heating cutoff action', () => {
    const plan = EmergencyResponseEngine.generatePlan({
      incidentType: 'temperature',
      severity: 'critical',
      value: 55.0,
      unit: '°C',
      location: 'Boiler Room',
      houseId: 'HOUSE_001',
      alertId: 'ALERT_TEMP_TEST'
    });

    const heatAction = plan.availableActions.find(a => a.actionType === 'set_temperature');
    assert.ok(heatAction, 'Thermostat setback action must be offered');
  });
});
