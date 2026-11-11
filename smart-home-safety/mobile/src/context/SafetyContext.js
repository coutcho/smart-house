import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const SafetyContext = createContext(null);

export const SafetyProvider = ({ children }) => {
  const { user } = useAuth();
  const [houseId, setHouseId] = useState('HOUSE_001');
  const [overallSafety, setOverallSafety] = useState('NORMAL');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getDashboard(houseId);
      if (data && data.success) {
        setOverallSafety(data.overallSafety || 'NORMAL');
        setActiveAlerts(data.activeAlerts || []);
        setSensors(data.sensors || []);
        setDevices(data.devices || []);
        setLastUpdated(new Date());
        setBackendConnected(true);
      }
    } catch (err) {
      console.warn('[SafetyContext] Failed to fetch dashboard:', err.message);
      setBackendConnected(false);
    }
  }, [user, houseId]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchDashboard();
    setIsRefreshing(false);
  };

  // Auto-refresh telemetry every 3.5 seconds
  useEffect(() => {
    if (!user) return;

    fetchDashboard();
    const interval = setInterval(() => {
      fetchDashboard();
    }, 3500);

    return () => clearInterval(interval);
  }, [user, fetchDashboard]);

  const executeAction = async ({ deviceId, actionType, parameters = {} }) => {
    const result = await api.executeDeviceAction({
      deviceId,
      houseId,
      actionType,
      parameters
    });
    // Immediately refresh state
    await fetchDashboard();
    return result;
  };

  const acknowledgeAlert = async (alertId) => {
    const res = await api.acknowledgeAlert(alertId);
    await fetchDashboard();
    return res;
  };

  const resolveAlert = async (alertId, notes) => {
    const res = await api.resolveAlert(alertId, notes);
    await fetchDashboard();
    return res;
  };

  return (
    <SafetyContext.Provider
      value={{
        houseId,
        setHouseId,
        overallSafety,
        activeAlerts,
        sensors,
        devices,
        isRefreshing,
        lastUpdated,
        backendConnected,
        refresh,
        executeAction,
        acknowledgeAlert,
        resolveAlert
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
};

export const useSafety = () => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};
