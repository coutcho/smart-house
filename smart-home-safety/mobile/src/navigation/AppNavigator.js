import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { SensorsScreen } from '../screens/Sensors/SensorsScreen';
import { ActiveAlertsScreen } from '../screens/Alerts/ActiveAlertsScreen';
import { EmergencyResponseScreen } from '../screens/Alerts/EmergencyResponseScreen';
import { IncidentHistoryScreen } from '../screens/History/IncidentHistoryScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { COLORS } from '../theme/colors';
import { Bell, Clock3, House, Radio, Settings2, Shield, ArrowLeft } from 'lucide-react-native';

const TABS = [
  { id: 'Dashboard', label: 'Home', Icon: House },
  { id: 'Sensors', label: 'Sensors', Icon: Radio },
  { id: 'Alerts', label: 'Alerts', Icon: Bell },
  { id: 'History', label: 'History', Icon: Clock3 },
  { id: 'Settings', label: 'Settings', Icon: Settings2 }
];

export const AppNavigator = () => {
  const { user, loading } = useAuth();
  const { activeAlerts } = useSafety();

  // Navigation state
  const [authScreen, setAuthScreen] = useState('Login'); // 'Login' | 'Register'
  const [currentTab, setCurrentTab] = useState('Dashboard');
  const [emergencyAlertId, setEmergencyAlertId] = useState(null);

  // Fake navigation object matching React Navigation contract
  const navigation = {
    navigate: (screenName, params = {}) => {
      if (screenName === 'Login' || screenName === 'Register') {
        setAuthScreen(screenName);
      } else if (screenName === 'EmergencyResponse') {
        setEmergencyAlertId(params.alertId);
      } else {
        setEmergencyAlertId(null);
        setCurrentTab(screenName);
      }
    },
    goBack: () => {
      setEmergencyAlertId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Shield size={42} color={COLORS.primary} style={styles.loadingLogo} />
        <Text style={styles.loadingText}>Loading SafeHome SOS...</Text>
      </View>
    );
  }

  // Auth Flow
  if (!user) {
    if (authScreen === 'Register') {
      return <RegisterScreen navigation={navigation} />;
    }
    return <LoginScreen navigation={navigation} />;
  }

  // Emergency Response Modal / Screen
  if (emergencyAlertId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topNavHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={18} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.topNavTitle}>Emergency Protocol</Text>
          <View style={{ width: 50 }} />
        </View>
        <EmergencyResponseScreen
          route={{ params: { alertId: emergencyAlertId } }}
          navigation={navigation}
        />
      </SafeAreaView>
    );
  }

  // Main App Tabs
  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'Dashboard':
        return <DashboardScreen navigation={navigation} />;
      case 'Sensors':
        return <SensorsScreen navigation={navigation} />;
      case 'Alerts':
        return <ActiveAlertsScreen navigation={navigation} />;
      case 'History':
        return <IncidentHistoryScreen navigation={navigation} />;
      case 'Settings':
        return <SettingsScreen navigation={navigation} />;
      default:
        return <DashboardScreen navigation={navigation} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContainer}>
        {renderCurrentScreen()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          const isAlertsTab = tab.id === 'Alerts';
          const alertBadgeCount = isAlertsTab ? activeAlerts.length : 0;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setCurrentTab(tab.id)}
            >
              <View style={styles.tabIconWrap}>
                <tab.Icon size={20} color={isActive ? COLORS.primary : COLORS.textMuted} strokeWidth={isActive ? 2.5 : 2} />
                {alertBadgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{alertBadgeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    marginBottom: 16,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  screenContainer: {
    flex: 1,
  },
  topNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    paddingBottom: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    minWidth: 42,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: COLORS.critical,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
});
