/**
 * API Key Middleware for IoT / Simulated Hardware Ingestion
 */

const EXPECTED_API_KEY = process.env.SENSOR_API_KEY || 'smart_home_sensor_secret_key_2026';

function verifySensorApiKey(req, res, next) {
  const providedKey = req.header('X-Sensor-API-Key') || req.query.apiKey;

  if (!providedKey) {
    return res.status(401).json({
      error: 'Unauthorized: Missing required X-Sensor-API-Key header.'
    });
  }

  if (providedKey !== EXPECTED_API_KEY) {
    return res.status(403).json({
      error: 'Forbidden: Invalid X-Sensor-API-Key provided.'
    });
  }

  next();
}

module.exports = { verifySensorApiKey };
