import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { useSafety } from '../../context/SafetyContext';
import { COLORS } from '../../theme/colors';
import { Bell, MapPin, ShieldCheck, ArrowUpRight } from 'lucide-react-native';

export const ActiveAlertsScreen = ({ navigation }) => {
  const { activeAlerts, isRefreshing, refresh } = useSafety();

  const handleOpenPlan = (alertId) => {
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
      <View style={styles.screenHeading}><View style={styles.headingIcon}><Bell size={19} color={COLORS.primary} /></View><View><Text style={styles.headerTitle}>Active incidents</Text><Text style={styles.headingSubtitle}>{activeAlerts.length} requiring attention</Text></View></View>

      {activeAlerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <ShieldCheck size={34} color={COLORS.safe} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Active Safety Incidents</Text>
          <Text style={styles.emptySubtitle}>
            All environmental readings are within normal parameters.
          </Text>
        </View>
      ) : (
        activeAlerts.map((alert) => {
          const isCritical = alert.severity === 'critical';
          const cardBorder = isCritical ? COLORS.critical : COLORS.warning;
          const badgeBg = isCritical ? COLORS.criticalDark : COLORS.warningDark;
          const badgeColor = isCritical ? COLORS.critical : COLORS.warning;

          return (
            <View key={alert.alertId} style={[styles.alertCard, { borderColor: cardBorder }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.severityBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.severityText, { color: badgeColor }]}>
                    {alert.severity.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.locationRow}><MapPin size={13} color={COLORS.textSecondary} /><Text style={styles.locationText}>{alert.location}</Text></View>
              </View>

              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDetails}>
                Sensor: {alert.sensorId} | Reading: {alert.triggerValue} {alert.unit}
              </Text>

              <TouchableOpacity
                style={[styles.btnPlan, { backgroundColor: isCritical ? COLORS.sosRed : COLORS.primary }]}
                onPress={() => handleOpenPlan(alert.alertId)}
              >
                <Text style={styles.btnPlanText}>Open response guide</Text><ArrowUpRight size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 0,
  },
  screenHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  headingIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  headingSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.safe,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  alertDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  btnPlan: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnPlanText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
