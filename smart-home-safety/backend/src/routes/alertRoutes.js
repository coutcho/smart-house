const express = require('express');
const router = express.Router();
const AlertController = require('../controllers/alertController');
const { verifyFirebaseAuth } = require('../middleware/authMiddleware');

// Active alerts for dashboard & notification center
router.get('/active', verifyFirebaseAuth, AlertController.getActiveAlerts);

// Historic alerts log
router.get('/history', verifyFirebaseAuth, AlertController.getAlertHistory);

// Dynamic emergency response plan for a specific incident
router.get('/:alertId/response', verifyFirebaseAuth, AlertController.getEmergencyResponse);

// Acknowledge alert
router.post('/:alertId/acknowledge', verifyFirebaseAuth, AlertController.acknowledgeAlert);

// Resolve alert
router.post('/:alertId/resolve', verifyFirebaseAuth, AlertController.resolveAlert);

module.exports = router;
