const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Import mobile services
const { firebaseAuth } = require('../src/services/firebase');
const { api } = require('../src/services/api');

describe('Mobile App Authentication Service Tests', () => {

  test('Validates credentials and fails when password is too short', async () => {
    await assert.rejects(
      async () => {
        await firebaseAuth.signInWithEmailAndPassword('user@safehome.dz', '123');
      },
      /Password must be at least 6 characters/i
    );

    await assert.rejects(
      async () => {
        await firebaseAuth.signInWithEmailAndPassword('', '');
      },
      /Please provide both email and password/i
    );
  });

  test('Successfully signs in homeowner and generates valid Bearer token', async () => {
    const res = await firebaseAuth.signInWithEmailAndPassword('owner@safehome.dz', 'safehome2026');
    assert.ok(res.user);
    assert.equal(res.user.email, 'owner@safehome.dz');
    assert.equal(res.user.displayName, 'Owner');
    assert.ok(res.user.uid.startsWith('USER_'));

    const token = await res.user.getIdToken();
    assert.equal(token, `mock_user_${res.user.uid}`);
  });

  test('Registers a new resident and updates current user state', async () => {
    const res = await firebaseAuth.createUserWithEmailAndPassword('karim@safehome.dz', 'secret2026', 'Karim');
    assert.ok(res.user);
    assert.equal(res.user.displayName, 'Karim');
    assert.equal(firebaseAuth.currentUser.email, 'karim@safehome.dz');

    await firebaseAuth.signOut();
    assert.equal(firebaseAuth.currentUser, null);
  });
});

describe('Mobile API Service Configuration Tests', () => {

  test('Correctly attaches Bearer JWT authorization headers', () => {
    api.setAuthToken('mock_user_TEST_UID');
    const headers = api.getHeaders();
    assert.equal(headers['Authorization'], 'Bearer mock_user_TEST_UID');
    assert.equal(headers['Content-Type'], 'application/json');

    api.setAuthToken(null);
    const unauthHeaders = api.getHeaders();
    assert.equal(unauthHeaders['Authorization'], undefined);
  });

  test('Updates and sanitizes base URL', () => {
    api.setBaseUrl('http://192.168.1.50:5000/api/v1/');
    assert.equal(api.baseUrl, 'http://192.168.1.50:5000/api/v1');
  });
});

describe('Mobile Emergency Protocols & Algerian SOS Verification', () => {

  // Test against Backend Emergency Response Engine to ensure mobile consumes correct Algerian SOS contracts
  const EmergencyResponseEngine = require('../../backend/src/services/emergencyEngine');

  test('Gas Leak emergency plan defaults to Protection Civile (14) and Sonelgaz (3303)', () => {
    const plan = EmergencyResponseEngine.generatePlan({
      incidentType: 'gas',
      severity: 'critical',
      value: 520.0,
      unit: 'ppm',
      location: 'Cuisine',
      houseId: 'HOUSE_001',
      alertId: 'ALERT_DZ_GAS'
    });

    const numbers = plan.emergencyContacts.map(c => c.number);
    assert.ok(numbers.includes('14'), 'SOS number 14 (Protection Civile) must be in emergency contacts');
    assert.ok(numbers.includes('3303'), 'Sonelgaz number 3303 must be in emergency contacts');

    // Instructions must include call 14
    const instructionsText = plan.instructions.map(i => i.text).join(' ');
    assert.match(instructionsText, /14 \(Protection Civile\)/i);
    assert.match(instructionsText, /Sonelgaz/i);
  });

  test('Fire & Smoke emergency plan dials Protection Civile (14) and strictly prohibits delaying evacuation', () => {
    const plan = EmergencyResponseEngine.generatePlan({
      incidentType: 'smoke',
      severity: 'critical',
      value: 210.0,
      unit: 'obscuration_index',
      location: 'Salon',
      houseId: 'HOUSE_001',
      alertId: 'ALERT_DZ_FIRE'
    });

    const numbers = plan.emergencyContacts.map(c => c.number);
    assert.ok(numbers.includes('14'), 'Protection Civile 14 must be present');

    const instructionsText = plan.instructions.map(i => i.text).join(' ');
    assert.match(instructionsText, /call 14 \(Protection Civile\)/i);
    assert.match(instructionsText, /EVACUATE IMMEDIATELY/i);
    assert.match(instructionsText, /CRAWL LOW under smoke/i);
  });
});
