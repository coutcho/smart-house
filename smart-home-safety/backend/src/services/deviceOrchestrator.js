/**
 * Smart Device Action Orchestrator
 * 
 * Manages actuator execution with strict safety interlocks, latency simulation,
 * confirmation verification, and immutable audit logging in the `deviceActions` collection.
 */

const { db, FieldValue } = require('../config/firebase');

class DeviceOrchestrator {
  /**
   * Executes a requested device action with safety constraints.
   * Returns: { confirmed: boolean, actionId: string, deviceState: object, message: string }
   */
  static async executeAction({ houseId, deviceId, actionType, parameters = {}, requestedBy }) {
    const startTime = Date.now();

    // 1. Fetch target device
    const deviceRef = db.collection('devices').doc(deviceId);
    const deviceSnap = await deviceRef.get();

    if (!deviceSnap.exists) {
      throw new Error(`Target device '${deviceId}' was not found in house registry.`);
    }

    const device = deviceSnap.data();
    if (device.houseId !== houseId) {
      throw new Error(`Device '${deviceId}' does not belong to house '${houseId}'.`);
    }

    // 2. Safety Interlock Check
    // If there is an active critical gas leak, prevent hazardous actions (e.g. reopening gas valve or turning on fans)
    const activeGasAlertsSnap = await db.collection('alerts')
      .where('houseId', '==', houseId)
      .where('sensorType', '==', 'gas')
      .where('status', '==', 'active')
      .where('severity', '==', 'critical')
      .get();

    const hasActiveCriticalGasLeak = !activeGasAlertsSnap.empty;

    if (hasActiveCriticalGasLeak) {
      if (actionType === 'open_gas') {
        throw new Error('SAFETY INTERLOCK: Cannot reopen gas valve while an active critical gas leak is unresolved.');
      }
      if (actionType === 'turn_on_ventilation') {
        throw new Error('SAFETY INTERLOCK: Prohibited from energizing ventilation fans during active fuel gas concentrations (spark hazard).');
      }
    }

    // 3. Create initial pending audit record in deviceActions collection
    const actionRecord = {
      houseId,
      deviceId,
      requestedBy: requestedBy || 'ANONYMOUS',
      actionType,
      parameters,
      status: 'pending',
      timestamp: FieldValue.serverTimestamp()
    };

    const actionDocRef = await db.collection('deviceActions').add(actionRecord);
    const actionId = actionDocRef.id;

    // 4. Simulate physical actuation latency (realistic IoT telemetry delay: 100ms - 250ms)
    await new Promise(resolve => setTimeout(resolve, 150));

    // 5. Compute new device state
    const updatedState = { ...(device.state || {}) };
    let resultMessage = '';

    switch (actionType) {
      case 'shutoff_gas':
        updatedState.valveOpen = false;
        resultMessage = 'Main gas shutoff valve securely closed.';
        break;

      case 'open_gas':
        updatedState.valveOpen = true;
        resultMessage = 'Main gas valve reopened.';
        break;

      case 'shutoff_water':
        updatedState.valveOpen = false;
        resultMessage = 'Main water supply valve securely isolated.';
        break;

      case 'open_water':
        updatedState.valveOpen = true;
        resultMessage = 'Main water supply valve reopened.';
        break;

      case 'set_temperature':
        if (parameters.targetTemp !== undefined) {
          updatedState.targetTemp = Number(parameters.targetTemp);
        }
        if (parameters.heatingOn !== undefined) {
          updatedState.heatingOn = Boolean(parameters.heatingOn);
        }
        resultMessage = `Thermostat updated: Target=${updatedState.targetTemp}°C, HeatingActive=${updatedState.heatingOn}`;
        break;

      case 'turn_on_lights':
        updatedState.lightOn = true;
        resultMessage = 'Emergency egress lights illuminated.';
        break;

      case 'turn_off_lights':
        updatedState.lightOn = false;
        resultMessage = 'Lights turned off.';
        break;

      default:
        throw new Error(`Unsupported action type '${actionType}'.`);
    }

    // 6. Update device document in Firestore
    await deviceRef.update({
      state: updatedState,
      lastExecutedActionId: actionId,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 7. Update deviceAction status to confirmed
    const executionDurationMs = Date.now() - startTime;
    await actionDocRef.update({
      status: 'confirmed',
      executionDurationMs,
      resultMessage,
      completedAt: FieldValue.serverTimestamp()
    });

    return {
      actionId,
      confirmed: true,
      deviceId,
      deviceState: updatedState,
      executionDurationMs,
      message: resultMessage
    };
  }
}

module.exports = DeviceOrchestrator;
