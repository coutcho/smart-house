/**
 * Safety thresholds and hazard configuration for environmental sensors.
 * Compliant with NFPA and residential gas/fire safety standards.
 */

const SAFETY_THRESHOLDS = {
  gas: {
    unit: 'ppm',
    warningThreshold: 100.0,
    emergencyThreshold: 400.0,
    name: 'Combustible Gas (Methane / LPG / CO)',
    description: 'Flammable and toxic gas concentration in air.'
  },
  smoke: {
    unit: 'obscuration_index',
    warningThreshold: 50.0,
    emergencyThreshold: 150.0,
    name: 'Smoke / Fire Particulates',
    description: 'Optical smoke chamber obscuration rating.'
  },
  temperature: {
    unit: '°C',
    warningThreshold: 38.0,
    emergencyThreshold: 48.0,
    name: 'Ambient Temperature',
    description: 'Indoor thermal hazard and fire precursor detection.'
  },
  water: {
    unit: 'conductivity',
    warningThreshold: 0.3, // Surface moisture
    emergencyThreshold: 0.7, // Standing water / flood
    name: 'Water Leakage',
    description: 'Liquid electrical conductivity detection.'
  }
};

const WATCHDOG_CONFIG = {
  heartbeatIntervalSec: 10,
  warningTimeoutSec: 60,
  offlineTimeoutSec: 120
};

module.exports = {
  SAFETY_THRESHOLDS,
  WATCHDOG_CONFIG
};
