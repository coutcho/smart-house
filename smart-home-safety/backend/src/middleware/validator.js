/**
 * Request Validation Middleware
 */

const ALLOWED_SENSOR_TYPES = ['gas', 'smoke', 'temperature', 'water'];
const ALLOWED_ACTION_TYPES = [
  'shutoff_gas',
  'open_gas',
  'shutoff_water',
  'open_water',
  'set_temperature',
  'turn_on_lights',
  'turn_off_lights'
];

function validateSensorReading(req, res, next) {
  const { sensorId, houseId, type, value, unit } = req.body;

  if (!sensorId || typeof sensorId !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'sensorId' string." });
  }

  if (!houseId || typeof houseId !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'houseId' string." });
  }

  if (!type || !ALLOWED_SENSOR_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Invalid sensor 'type'. Must be one of: ${ALLOWED_SENSOR_TYPES.join(', ')}.`
    });
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return res.status(400).json({ error: "Missing or invalid numeric 'value'." });
  }

  if (!unit || typeof unit !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'unit' string." });
  }

  next();
}

function validateDeviceAction(req, res, next) {
  const { actionType, houseId } = req.body;

  if (!actionType || !ALLOWED_ACTION_TYPES.includes(actionType)) {
    return res.status(400).json({
      error: `Invalid 'actionType'. Must be one of: ${ALLOWED_ACTION_TYPES.join(', ')}.`
    });
  }

  if (!houseId || typeof houseId !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'houseId' string." });
  }

  next();
}

module.exports = {
  validateSensorReading,
  validateDeviceAction
};
