import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Linking
} from 'react-native';
import { useSafety } from '../../context/SafetyContext';
import { useAuth } from '../../context/AuthContext';
import { SafetyBadge } from '../../components/SafetyBadge';
import { SensorCard } from '../../components/SensorCard';
import { DeviceCard } from '../../components/DeviceCard';
import { COLORS } from '../../theme/colors';
import { Siren, ArrowUpRight, Radio, Shield } from 'lucide-react-native';

export const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const {
    overallSafety,
    activeAlerts,
    sensors,
    devices,
    isRefreshing,
    refresh,
    executeAction,
    backendConnected
  } = useSafety();

  const handleDialSOS = () => {
    Linking.openURL('tel:14').catch(() => {
      alert('Unable to open phone dialer. SOS Number: 14 (Protection Civile)');
    });
  };

  const handleOpenEmergencyPlan = (alertId) => {
    navigation.navigate('EmergencyResponse', { alertId });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>SAFEHOME · ALGIERS</Text>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : 'evening'}, {user?.displayName?.split(' ')[0] || 'Resident'}</Text>
          <Text style={styles.houseName}>Your home safety overview</Text>
        </View>
        <TouchableOpacity style={styles.sosButton} onPress={handleDialSOS}>
          <Siren size={16} color="#fff" />
          <Text style={styles.sosText}>SOS 14</Text>
        </TouchableOpacity>
      </View>

      {!backendConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Backend connection unavailable. Retrying...</Text>
        </View>
      )}

      {/* Safety Status Banner */}
      <SafetyBadge status={overallSafety} alertCount={activeAlerts.length} />

      {/* Urgent Emergency Callout if Alert Active */}
      {activeAlerts.length > 0 && (
        <View style={styles.activeAlertCard}>
          <View style={styles.alertHeaderRow}>
            <Text style={styles.urgentTag}>HAZARD INCIDENT ACTIVE</Text>
            <Text style={styles.alertTime}>Just now</Text>
          </View>
          <Text style={styles.alertTitle}>{activeAlerts[0].title}</Text>
            <Text style={styles.alertSubtitle}>
            Location: {activeAlerts[0].location} | Value: {activeAlerts[0].triggerValue} {activeAlerts[0].unit}
          </Text>
          <TouchableOpacity
            style={styles.btnActionPlan}
            onPress={() => handleOpenEmergencyPlan(activeAlerts[0].alertId)}
          >
            <Text style={styles.btnActionPlanText}>View response plan and shutoffs</Text><ArrowUpRight size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Environmental Sensors Summary */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}><View style={styles.sectionIcon}><Radio size={17} color={COLORS.primary} /></View><Text style={styles.sectionTitle}>Sensors <Text style={styles.count}>· {sensors.length}</Text></Text></View>
        <TouchableOpacity onPress={() => navigation.navigate('Sensors')}>
          <Text style={styles.seeAllText}>Manage Sensors ›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sensorGrid}>
        {sensors.map((sensor) => (
          <SensorCard key={sensor.sensorId} sensor={sensor} compact />
        ))}
      </View>

      {/* Safety Actuators Summary */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}><View style={styles.sectionIcon}><Shield size={17} color={COLORS.safe} /></View><Text style={styles.sectionTitle}>Safety controls <Text style={styles.count}>· {devices.length}</Text></Text></View>
      </View>

      {devices.map((device) => (
        <DeviceCard
          key={device.deviceId}
          device={device}
          onExecuteAction={executeAction}
          compact
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  greeting: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  houseName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 5 },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sosRed,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    elevation: 3,
  },
  sosIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  sosText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  offlineBanner: {
    backgroundColor: COLORS.warningDark,
    borderColor: COLORS.warning,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  offlineText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  activeAlertCard: {
    backgroundColor: COLORS.criticalDark,
    borderColor: COLORS.critical,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  urgentTag: {
    color: COLORS.critical,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertSubtitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 12,
  },
  btnActionPlan: {
    backgroundColor: COLORS.sosRed,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnActionPlanText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  count: { color: COLORS.textMuted, fontWeight: '600' },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
});
