const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/deviceController');
const { verifyFirebaseAuth } = require('../middleware/authMiddleware');
const { validateDeviceAction } = require('../middleware/validator');

// List devices
router.get('/', verifyFirebaseAuth, DeviceController.getDevices);

// Execute smart actuator action
router.post('/:deviceId/actions', verifyFirebaseAuth, validateDeviceAction, DeviceController.executeAction);

// Audit history of device actions
router.get('/:deviceId/actions/history', verifyFirebaseAuth, DeviceController.getActionHistory);

module.exports = router;
