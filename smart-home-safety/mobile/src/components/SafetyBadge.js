import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { ShieldCheck, Siren, TriangleAlert } from 'lucide-react-native';

export const SafetyBadge = ({ status = 'NORMAL', alertCount = 0 }) => {
  let bgColor = COLORS.safeDark;
  let borderColor = COLORS.safe;
  let textColor = COLORS.safe;
  let title = 'ALL SYSTEMS SECURE';
  let subtitle = 'All environmental sensors within safe operating thresholds';
  let Icon = ShieldCheck;

  if (status === 'CRITICAL') {
    bgColor = COLORS.criticalDark;
    borderColor = COLORS.critical;
    textColor = COLORS.critical;
    title = 'CRITICAL EMERGENCY DETECTED';
    subtitle = `${alertCount} urgent hazard(s) requiring immediate evacuation / action!`;
    Icon = Siren;
  } else if (status === 'WARNING') {
    bgColor = COLORS.warningDark;
    borderColor = COLORS.warning;
    textColor = COLORS.warning;
    title = 'HAZARD WARNING ACTIVE';
    subtitle = `${alertCount} sensor threshold anomaly detected. Inspect promptly.`;
    Icon = TriangleAlert;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.headerRow}>
        <View style={styles.icon}><Icon size={23} color={textColor} /></View>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
    opacity: 0.9,
  },
});
