/**
 * Device Controller
 * 
 * Exposes endpoints for managing smart actuators, executing remote safety actions,
 * and reviewing the immutable action audit trail.
 */

const { db } = require('../config/firebase');
const DeviceOrchestrator = require('../services/deviceOrchestrator');

class DeviceController {
  /**
   * GET /api/v1/devices
   */
  static async getDevices(req, res) {
    try {
      const houseId = req.query.houseId || 'HOUSE_001';
      const snap = await db.collection('devices').where('houseId', '==', houseId).get();
      const devices = snap.docs.map(doc => ({ deviceId: doc.id, ...doc.data() }));

      return res.json({ success: true, count: devices.length, devices });
    } catch (error) {
      console.error('[DeviceController] Error getting devices:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/devices/:deviceId/actions
   * Triggers an actuator command. NEVER responds with success unless confirmed.
   */
  static async executeAction(req, res) {
    try {
      const { deviceId } = req.params;
      const { actionType, parameters, houseId } = req.body;
      const requestedBy = req.user ? req.user.uid : 'DEMO_USER';

      const result = await DeviceOrchestrator.executeAction({
        houseId: houseId || 'HOUSE_001',
        deviceId,
        actionType,
        parameters: parameters || {},
        requestedBy
      });

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[DeviceController] Error executing action:', error.message);
      return res.status(400).json({
        success: false,
        confirmed: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/devices/:deviceId/actions/history
   */
  static async getActionHistory(req, res) {
    try {
      const { deviceId } = req.params;
      const snap = await db.collection('deviceActions')
        .where('deviceId', '==', deviceId)
        .get();

      const history = snap.docs.map(doc => ({ actionId: doc.id, ...doc.data() }));
      history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return res.json({ success: true, count: history.length, history });
    } catch (error) {
      console.error('[DeviceController] Error getting action history:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = DeviceController;
