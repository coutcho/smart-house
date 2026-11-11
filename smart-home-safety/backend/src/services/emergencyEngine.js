/**
 * Emergency Response Engine (ERE)
 * 
 * Analyzes sensor readings against safety thresholds, classifies incidents by severity,
 * generates dynamic emergency response instructions, enforces strict life-safety constraints,
 * and coordinates automatic smart device mitigations.
 */

const { SAFETY_THRESHOLDS } = require('../config/thresholds');

class EmergencyResponseEngine {
  /**
   * Evaluates an incoming reading against thresholds.
   * Returns severity: 'normal' | 'warning' | 'critical'
   */
  static evaluateSeverity(sensorType, value) {
    const threshold = SAFETY_THRESHOLDS[sensorType];
    if (!threshold) {
      return { severity: 'normal', threshold: null };
    }

    if (value >= threshold.emergencyThreshold) {
      return { severity: 'critical', threshold };
    } else if (value >= threshold.warningThreshold) {
      return { severity: 'warning', threshold };
    }

    return { severity: 'normal', threshold };
  }

  /**
   * Generates a dynamic emergency response plan customized to the incident type,
   * location, and reading value. Enforces life-safety protocols strictly.
   */
  static generatePlan({ incidentType, severity, value, unit, location, houseId, alertId }) {
    const plan = {
      alertId,
      houseId,
      incidentType,
      severity,
      evacuationRequired: false,
      title: '',
      headline: '',
      instructions: [],
      safetyWarnings: [],
      availableActions: [],
      emergencyContacts: [
        { name: 'Protection Civile (SOS Pompiers)', number: '14', priority: 'high' }
      ]
    };

    switch (incidentType) {
      case 'gas':
        this._buildGasResponsePlan(plan, severity, value, unit, location);
        break;

      case 'smoke':
        this._buildFireSmokeResponsePlan(plan, severity, value, unit, location);
        break;

      case 'temperature':
        this._buildHighTempResponsePlan(plan, severity, value, unit, location);
        break;

      case 'water':
        this._buildWaterLeakResponsePlan(plan, severity, value, unit, location);
        break;

      case 'sensor_offline':
        this._buildSensorOfflinePlan(plan, location);
        break;

      default:
        plan.title = `Hazard Notice: ${incidentType}`;
        plan.headline = `Environmental anomaly detected in ${location}.`;
        plan.instructions.push({
          step: 1,
          text: 'Inspect the area cautiously.',
          isCritical: false
        });
        break;
    }

    return plan;
  }

  /**
   * Gas Leak Response Plan
   * STRICT SAFETY RULE:
   * - Immediate evacuation.
   * - Warn against electrical switches and open flames.
   * - NEVER recommend opening windows or powered ventilation (spark/explosion risk).
   */
  static _buildGasResponsePlan(plan, severity, value, unit, location) {
    plan.emergencyContacts.push({
      name: 'Sonelgaz Dépannage Gaz',
      number: '3303',
      priority: 'high'
    });

    if (severity === 'critical') {
      plan.evacuationRequired = true;
      plan.title = 'CRITICAL GAS LEAKAGE DETECTED';
      plan.headline = `Dangerous gas concentration (${value} ${unit}) detected in ${location}. Immediate danger of fire or explosion.`;

      plan.safetyWarnings = [
        'DO NOT operate ANY light switches, electrical outlets, or appliances.',
        'DO NOT use telephones, smartphones, or flashlights indoors.',
        'DO NOT use open flames, matches, or ignition sources.',
        'NEVER attempt to operate powered ventilation fans or air conditioning.',
        'DO NOT delay evacuation to open windows or gather personal belongings.'
      ];

      plan.instructions = [
        {
          step: 1,
          text: 'EVACUATE IMMEDIATELY: Move all occupants outdoors into safe fresh air.',
          isCritical: true
        },
        {
          step: 2,
          text: 'LEAVE DOORS OPEN behind you as you exit to allow natural dispersion without delay.',
          isCritical: true
        },
        {
          step: 3,
          text: 'DO NOT touch light switches or electrical equipment (prevent spark arcing).',
          isCritical: true
        },
        {
          step: 4,
          text: 'CALL 14 (Protection Civile) or Sonelgaz (3303) ONLY once safely outdoors at a distance.',
          isCritical: true
        },
        {
          step: 5,
          text: 'DO NOT re-enter the residence until authorized by certified emergency officials.',
          isCritical: false
        }
      ];

      plan.availableActions = [
        {
          actionType: 'shutoff_gas',
          label: 'Remotely Close Main Gas Valve',
          deviceType: 'gas_valve',
          requiresConfirmation: false,
          description: 'Cuts fuel supply at the meter without creating indoor ignition hazards.'
        }
      ];
    } else {
      // Warning level
      plan.title = 'Elevated Gas Concentration Warning';
      plan.headline = `Elevated gas reading (${value} ${unit}) detected in ${location}.`;
      plan.safetyWarnings = [
        'Do not light matches or generate electrical sparks in the area.',
        'Do not operate mechanical switches nearby.'
      ];
      plan.instructions = [
        {
          step: 1,
          text: 'Check gas burner controls and appliances without operating electrical switches.',
          isCritical: true
        },
        {
          step: 2,
          text: 'If odor of gas persists or readings climb, evacuate outdoors immediately.',
          isCritical: true
        },
        {
          step: 3,
          text: 'Trigger remote gas shutoff valve if in doubt.',
          isCritical: false
        }
      ];
      plan.availableActions = [
        {
          actionType: 'shutoff_gas',
          label: 'Close Main Gas Valve',
          deviceType: 'gas_valve',
          requiresConfirmation: true,
          description: 'Isolates the residential fuel gas line.'
        }
      ];
    }
  }

  /**
   * Smoke & Fire Detection Response Plan
   * STRICT SAFETY RULE:
   * - Advise immediate evacuation.
   * - Never recommend actions that delay evacuation.
   */
  static _buildFireSmokeResponsePlan(plan, severity, value, unit, location) {
    plan.emergencyContacts.push({
      name: 'Protection Civile (Pompiers)',
      number: '14',
      priority: 'critical'
    });

    plan.evacuationRequired = true;
    plan.title = severity === 'critical' ? 'FIRE & SMOKE EMERGENCY' : 'SMOKE DETECTED WARNING';
    plan.headline = `Heavy particulate/smoke density (${value} ${unit}) detected in ${location}.`;

    plan.safetyWarnings = [
      'DO NOT delay evacuation to search for pets or personal possessions.',
      'DO NOT open closed doors that feel warm to the back of your hand.',
      'NEVER use an elevator during a fire incident.'
    ];

    plan.instructions = [
      {
        step: 1,
        text: 'EVACUATE IMMEDIATELY: Get out and stay out.',
        isCritical: true
      },
      {
        step: 2,
        text: 'CRAWL LOW under smoke where air is cleaner and cooler.',
        isCritical: true
      },
      {
        step: 3,
        text: 'FEEL DOORS: Touch doorknobs with the back of your hand before opening. If hot, use an alternate route.',
        isCritical: true
      },
      {
        step: 4,
        text: 'MEET AT DESIGNATED OUTDOOR MEETING SPOT and call 14 (Protection Civile) immediately.',
        isCritical: true
      }
    ];

    plan.availableActions = [
      {
        actionType: 'turn_on_lights',
        label: 'Illuminate Emergency Egress Pathway',
        deviceType: 'smart_light',
        requiresConfirmation: false,
        description: 'Turns on smart safety lighting to guide occupants to exits.'
      }
    ];
  }

  /**
   * High Temperature Response Plan
   */
  static _buildHighTempResponsePlan(plan, severity, value, unit, location) {
    plan.title = severity === 'critical' ? 'CRITICAL HIGH TEMPERATURE DETECTED' : 'Elevated Temperature Warning';
    plan.headline = `Temperature in ${location} has reached ${value} ${unit}.`;

    plan.safetyWarnings = [
      'Uncontrolled thermal escalation can be a precursor to furnace failure or hidden wall fire.',
      'Exercise caution around boiler rooms and HVAC equipment.'
    ];

    plan.instructions = [
      {
        step: 1,
        text: `Verify current room temperature (${value} ${unit}) and check for smoke or burning smell.`,
        isCritical: severity === 'critical'
      },
      {
        step: 2,
        text: 'Inspect the central heating / furnace / boiler controls for runaway thermostat.',
        isCritical: false
      },
      {
        step: 3,
        text: 'Shut down the heating system via smart control or manual circuit breaker.',
        isCritical: false
      }
    ];

    plan.availableActions = [
      {
        actionType: 'set_temperature',
        label: 'Emergency Heating Cutoff / Thermostat Setback',
        deviceType: 'heating_thermostat',
        parameters: { targetTemp: 16.0, heatingOn: false },
        requiresConfirmation: false,
        description: 'Immediately disables active heating call.'
      }
    ];
  }

  /**
   * Water Leakage Response Plan
   */
  static _buildWaterLeakResponsePlan(plan, severity, value, unit, location) {
    plan.title = severity === 'critical' ? 'CRITICAL WATER LEAK / FLOOD DETECTED' : 'Moisture / Water Leak Warning';
    plan.headline = `Water ingress detected in ${location} (${value >= 0.7 ? 'Standing Water' : 'Moisture Alert'}).`;

    plan.safetyWarnings = [
      'DO NOT step into standing water if electrical cords, outlets, or appliances are submerged.',
      'Risk of severe electric shock in flooded areas.'
    ];

    plan.instructions = [
      {
        step: 1,
        text: `Locate water ingress in ${location} while staying clear of electrical hazards.`,
        isCritical: true
      },
      {
        step: 2,
        text: 'Shut off the main household water supply immediately to prevent structural damage.',
        isCritical: true
      },
      {
        step: 3,
        text: 'Turn off the electrical breaker serving the flooded zone if safe to reach.',
        isCritical: false
      }
    ];

    plan.availableActions = [
      {
        actionType: 'shutoff_water',
        label: 'Actuate Smart Water Shutoff Valve',
        deviceType: 'water_valve',
        parameters: { valveOpen: false },
        requiresConfirmation: false,
        description: 'Closes main water intake to prevent continuous flooding.'
      }
    ];
  }

  /**
   * Sensor Disconnection Plan
   */
  static _buildSensorOfflinePlan(plan, location) {
    plan.title = 'Sensor Communication Offline';
    plan.headline = `Environmental sensor in ${location} has stopped reporting telemetry.`;
    plan.instructions = [
      {
        step: 1,
        text: 'Check sensor physical power, battery level, and local Wi-Fi / RF bridge.',
        isCritical: false
      },
      {
        step: 2,
        text: 'Inspect the monitored area manually to ensure no undetected hazards exist.',
        isCritical: true
      }
    ];
    plan.safetyWarnings = [
      'Area is currently unmonitored for environmental hazards.'
    ];
  }
}

module.exports = EmergencyResponseEngine;
