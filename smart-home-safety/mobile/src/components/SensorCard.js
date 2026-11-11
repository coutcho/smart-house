import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { Flame, Droplets, Thermometer, Wind, Radio, Battery, MapPin } from 'lucide-react-native';

const SENSOR_ICONS = {
  gas: Flame,
  smoke: Wind,
  temperature: Thermometer,
  water: Droplets
};

export const SensorCard = ({ sensor, compact = false }) => {
  const {
    sensorId,
    type,
    location,
    lastValue,
    unit,
    status = 'normal',
    batteryLevel = 100,
    isOnline = true
  } = sensor;

  const Icon = SENSOR_ICONS[type] || Radio;

  let statusBg = COLORS.surfaceHighlight;
  let statusColor = COLORS.safe;
  let statusText = 'NORMAL';

  if (!isOnline || status === 'offline') {
    statusColor = COLORS.textMuted;
    statusText = 'OFFLINE';
  } else if (status === 'critical') {
    statusBg = COLORS.criticalDark;
    statusColor = COLORS.critical;
    statusText = 'CRITICAL';
  } else if (status === 'warning') {
    statusBg = COLORS.warningDark;
    statusColor = COLORS.warning;
    statusText = 'WARNING';
  }

  const formatValue = () => {
    if (typeof lastValue !== 'number') return '--';
    if (type === 'temperature') return `${lastValue.toFixed(1)} ${unit}`;
    if (type === 'gas') return `${Math.round(lastValue)} ${unit}`;
    if (type === 'smoke') return `${lastValue.toFixed(2)} ${unit}`;
    if (type === 'water') {
      return lastValue >= 0.7 ? 'Flood / Water Present' : lastValue >= 0.3 ? 'Moisture Detected' : 'Dry';
    }
    return `${lastValue} ${unit}`;
  };

  const indicatorColor = !isOnline || status === 'offline'
    ? COLORS.textMuted
    : status === 'critical'
      ? COLORS.critical
      : status === 'warning'
        ? COLORS.warning
        : COLORS.safe;
  const sensorLabel = `${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Sensor'} · ${location}`;
  const renderCompactReading = () => {
    if (type === 'water') return <Text style={styles.compactReadingText}>{formatValue()}</Text>;
    if (typeof lastValue !== 'number') return <Text style={styles.compactReadingText}>--</Text>;

    const value = type === 'temperature'
      ? lastValue.toFixed(1)
      : type === 'gas'
        ? String(Math.round(lastValue))
        : type === 'smoke'
          ? lastValue.toFixed(2)
          : String(lastValue);
    const compactUnit = type === 'smoke' && unit === 'obscuration_index' ? 'obs. idx' : unit;

    return (
      <View style={styles.compactReadingRow}>
        <Text style={styles.compactReadingText} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        <Text style={styles.compactUnit} numberOfLines={1}>{compactUnit}</Text>
      </View>
    );
  };

  if (compact) {
    return (
      <View style={[
        styles.card,
        styles.compactCard,
        status === 'critical' && styles.criticalCard,
        status === 'warning' && styles.warningCard,
        (!isOnline || status === 'offline') && styles.offlineCard
      ]}>
        <View style={styles.compactTopRow}>
          <Icon size={18} color={type === 'gas' ? COLORS.critical : COLORS.safe} strokeWidth={2.2} />
          <View style={[styles.statusDot, { backgroundColor: indicatorColor }]} />
        </View>
        <View style={styles.compactReading}>{renderCompactReading()}</View>
        <Text style={styles.compactLabel} numberOfLines={2}>{sensorLabel}</Text>
        <View style={styles.compactFooter}>
          <Battery size={12} color={COLORS.textMuted} />
          <Text style={styles.compactMeta}>{batteryLevel}% · {sensorId}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, status === 'critical' && styles.criticalCard]}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <View style={styles.icon}><Icon size={21} color={COLORS.primary} strokeWidth={2.2} /></View>
          <View>
            <Text style={styles.sensorType}>{type.toUpperCase()} SENSOR</Text>
            <View style={styles.locationRow}><MapPin size={12} color={COLORS.textMuted} /><Text style={styles.location}>{location}</Text></View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.readingRow}>
        <Text style={styles.readingValue}>{formatValue()}</Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.sensorId}>{sensorId}</Text>
        <View style={styles.batteryContainer}>
          <Battery size={13} color={COLORS.textSecondary} /><Text style={styles.batteryText}> {batteryLevel}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 12,
  },
  compactCard: {
    width: '48.5%',
    minHeight: 148,
    padding: 14,
    marginBottom: 0,
    justifyContent: 'space-between',
  },
  criticalCard: { borderColor: COLORS.critical },
  warningCard: { borderColor: COLORS.warning },
  offlineCard: { opacity: 0.62 },
  compactTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  compactReading: { minHeight: 34, justifyContent: 'center', marginBottom: 3 },
  compactReadingRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  compactReadingText: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: COLORS.textPrimary },
  compactUnit: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 5 },
  compactLabel: { fontSize: 12, lineHeight: 17, color: COLORS.textPrimary, minHeight: 34 },
  compactFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  compactMeta: { fontSize: 10, color: COLORS.textSecondary, marginLeft: 5, flexShrink: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sensorType: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  location: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  readingRow: {
    marginVertical: 6,
  },
  readingValue: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sensorId: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
