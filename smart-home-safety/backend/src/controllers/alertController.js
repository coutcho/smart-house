/**
 * Alert Controller
 * 
 * Manages incident alerting lifecycle, emergency response plans,
 * user acknowledgment, and resolution workflows.
 */

const { db, FieldValue } = require('../config/firebase');

class AlertController {
  /**
   * GET /api/v1/alerts/active
   */
  static async getActiveAlerts(req, res) {
    try {
      const houseId = req.query.houseId || 'HOUSE_001';
      const snap = await db.collection('alerts')
        .where('houseId', '==', houseId)
        .where('status', '==', 'active')
        .get();

      const alerts = snap.docs.map(doc => ({ alertId: doc.id, ...doc.data() }));

      // Sort critical first, then newest
      alerts.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (b.severity === 'critical' && a.severity !== 'critical') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
      console.error('[AlertController] Error fetching active alerts:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/alerts/history
   */
  static async getAlertHistory(req, res) {
    try {
      const houseId = req.query.houseId || 'HOUSE_001';
      const snap = await db.collection('alerts')
        .where('houseId', '==', houseId)
        .get();

      const alerts = snap.docs
        .map(doc => ({ alertId: doc.id, ...doc.data() }))
        .filter(a => a.status === 'resolved' || a.status === 'acknowledged');

      alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
      console.error('[AlertController] Error fetching alert history:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/alerts/:alertId/response
   */
  static async getEmergencyResponse(req, res) {
    try {
      const { alertId } = req.params;
      const responseSnap = await db.collection('emergencyResponses').doc(alertId).get();

      if (!responseSnap.exists) {
        return res.status(404).json({ error: `Emergency response plan for alert '${alertId}' not found.` });
      }

      // Also get current alert status
      const alertSnap = await db.collection('alerts').doc(alertId).get();
      const alertData = alertSnap.exists ? alertSnap.data() : null;

      return res.json({
        success: true,
        alert: alertData,
        responsePlan: responseSnap.data()
      });
    } catch (error) {
      console.error('[AlertController] Error fetching emergency response:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/alerts/:alertId/acknowledge
   */
  static async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;
      const userId = req.user ? req.user.uid : 'DEMO_USER';

      const alertRef = db.collection('alerts').doc(alertId);
      const alertSnap = await alertRef.get();

      if (!alertSnap.exists) {
        return res.status(404).json({ error: 'Alert not found.' });
      }

      await alertRef.update({
        status: 'acknowledged',
        acknowledgedAt: FieldValue.serverTimestamp(),
        acknowledgedBy: userId
      });

      return res.json({ success: true, message: 'Alert successfully acknowledged.' });
    } catch (error) {
      console.error('[AlertController] Error acknowledging alert:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/alerts/:alertId/resolve
   */
  static async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { resolutionNotes } = req.body;
      const userId = req.user ? req.user.uid : 'DEMO_USER';

      const alertRef = db.collection('alerts').doc(alertId);
      const alertSnap = await alertRef.get();

      if (!alertSnap.exists) {
        return res.status(404).json({ error: 'Alert not found.' });
      }

      const alertData = alertSnap.data();

      await alertRef.update({
        status: 'resolved',
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: userId,
        resolutionNotes: resolutionNotes || 'Hazard cleared and verified by resident.'
      });

      // Also mark sensor back to normal if no other active alerts exist
      if (alertData.sensorId) {
        await db.collection('sensors').doc(alertData.sensorId).update({
          status: 'normal',
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      return res.json({ success: true, message: 'Incident resolved successfully.' });
    } catch (error) {
      console.error('[AlertController] Error resolving alert:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AlertController;
