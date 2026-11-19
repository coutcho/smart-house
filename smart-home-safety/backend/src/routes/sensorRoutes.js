const express = require('express');
const router = express.Router();
const SensorController = require('../controllers/sensorController');
const { verifySensorApiKey } = require('../middleware/apiKeyMiddleware');
const { validateSensorReading } = require('../middleware/validator');

// Ingest sensor readings (IoT / Simulator)
router.post('/readings', verifySensorApiKey, validateSensorReading, SensorController.postReading);

// Heartbeat keep-alive (IoT / Simulator)
router.post('/heartbeat', verifySensorApiKey, SensorController.heartbeat);

// Simulator command sync (Simulator only)
router.get('/simulation/commands', verifySensorApiKey, SensorController.getSimulationCommands);
router.post('/simulation/commands/ack', verifySensorApiKey, SensorController.acknowledgeSimulationCommands);

// Query all sensors
router.get('/', SensorController.getSensors);

module.exports = router;
