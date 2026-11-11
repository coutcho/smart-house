/**
 * Mobile REST API Client
 * Communicates with the Smart Home Safety Node.js Backend.
 */

let isAndroid = false;
try {
  const RN = require("react-native");
  isAndroid = RN.Platform && RN.Platform.OS === "android";
} catch (_) {
  isAndroid = false;
}

const DEFAULT_BASE_URL = "http://192.168.100.24:5000/api/v1";

class ApiService {
  constructor() {
    this.baseUrl = DEFAULT_BASE_URL;
    this.token = null;
  }

  setBaseUrl(url) {
    if (url) this.baseUrl = url.replace(/\/+$/, "");
  }

  setAuthToken(token) {
    this.token = token;
  }

  getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          (data && (data.error || data.message)) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }
      return data;
    } catch (err) {
      console.warn(`[API] Request to ${endpoint} failed:`, err.message);
      throw err;
    }
  }

  // Dashboard Telemetry
  async getDashboard(houseId = "HOUSE_001") {
    return this.request(`/houses/${houseId}/dashboard`);
  }

  // Alerts
  async getActiveAlerts(houseId = "HOUSE_001") {
    return this.request(`/alerts/active?houseId=${houseId}`);
  }

  async getAlertHistory(houseId = "HOUSE_001") {
    return this.request(`/alerts/history?houseId=${houseId}`);
  }

  async getEmergencyResponse(alertId) {
    return this.request(`/alerts/${alertId}/response`);
  }

  async acknowledgeAlert(alertId) {
    return this.request(`/alerts/${alertId}/acknowledge`, { method: "POST" });
  }

  async resolveAlert(alertId, resolutionNotes) {
    return this.request(`/alerts/${alertId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolutionNotes }),
    });
  }

  // Devices & Actuators
  async getDevices(houseId = "HOUSE_001") {
    return this.request(`/devices?houseId=${houseId}`);
  }

  async executeDeviceAction({
    deviceId,
    houseId = "HOUSE_001",
    actionType,
    parameters = {},
  }) {
    return this.request(`/devices/${deviceId}/actions`, {
      method: "POST",
      body: JSON.stringify({ houseId, actionType, parameters }),
    });
  }

  async getDeviceActionHistory(deviceId) {
    return this.request(`/devices/${deviceId}/actions/history`);
  }

  // FCM Token Registration
  async registerFcmToken(fcmToken, houseId = "HOUSE_001") {
    return this.request("/houses/users/fcm-token", {
      method: "POST",
      body: JSON.stringify({ fcmToken, houseId }),
    });
  }

  // Health probe
  async checkHealth() {
    return this.request("/system/health");
  }
}

const api = new ApiService();

module.exports = {
  ApiService,
  api,
};
