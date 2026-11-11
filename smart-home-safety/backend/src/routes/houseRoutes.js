const express = require('express');
const router = express.Router();
const HouseController = require('../controllers/houseController');
const { verifyFirebaseAuth } = require('../middleware/authMiddleware');

// Dashboard summary data
router.get('/:houseId/dashboard', verifyFirebaseAuth, HouseController.getDashboard);

// Register / update user FCM push notification token
router.post('/users/fcm-token', verifyFirebaseAuth, HouseController.updateFcmToken);

module.exports = router;
