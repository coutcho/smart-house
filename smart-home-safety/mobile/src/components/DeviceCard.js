import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import { Lightbulb, Thermometer, Droplets, Flame, MapPin } from 'lucide-react-native';

export const DeviceCard = ({ device, onExecuteAction, compact = false }) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const { deviceId, name, type, location, state = {} } = device;
  const DeviceIcon = type === 'gas_valve' ? Flame : type === 'water_valve' ? Droplets : type === 'heating_thermostat' ? Thermometer : Lightbulb;

  const handleAction = async (actionType, parameters = {}) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await onExecuteAction({
        deviceId,
        actionType,
        parameters
      });
      if (res && res.confirmed) {
        setFeedback({ success: true, message: res.message });
      } else {
        setFeedback({ success: false, message: 'Action not confirmed by backend.' });
      }
    } catch (err) {
      setFeedback({ success: false, message: err.message });
      Alert.alert('Device Command Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderControl = () => {
    if (type === 'gas_valve') {
      const isOpen = state.valveOpen !== false;
      return (
        <View style={styles.actionContainer}>
          <Text style={[styles.stateText, { color: isOpen ? COLORS.warning : COLORS.safe }]}>
            State: {isOpen ? 'VALVE OPEN (Gas Flow Active)' : 'VALVE CLOSED (Gas Isolated)'}
          </Text>
          <TouchableOpacity
            style={[styles.btn, isOpen ? styles.btnDanger : styles.btnSafe]}
            disabled={loading}
            onPress={() => handleAction(isOpen ? 'shutoff_gas' : 'open_gas')}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>
                {isOpen ? 'Emergency Gas Shutoff' : 'Reopen Gas Valve'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'water_valve') {
      const isOpen = state.valveOpen !== false;
      return (
        <View style={styles.actionContainer}>
          <Text style={[styles.stateText, { color: isOpen ? COLORS.warning : COLORS.safe }]}>
            State: {isOpen ? 'VALVE OPEN (Water Supply On)' : 'VALVE CLOSED (Water Isolated)'}
          </Text>
          <TouchableOpacity
            style={[styles.btn, isOpen ? styles.btnDanger : styles.btnSafe]}
            disabled={loading}
            onPress={() => handleAction(isOpen ? 'shutoff_water' : 'open_water')}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>
                {isOpen ? 'Emergency Water Shutoff' : 'Restore Water Valve'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'heating_thermostat') {
      return (
        <View style={styles.actionContainer}>
          <Text style={styles.stateText}>
            Target: {state.targetTemp || 21}°C | Heating: {state.heatingOn ? 'ACTIVE' : 'OFF'}
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            disabled={loading}
            onPress={() => handleAction('set_temperature', { targetTemp: 16.0, heatingOn: false })}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Setback Heating to 16°C (Off)</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'smart_light') {
      const isOn = !!state.lightOn;
      return (
        <View style={styles.actionContainer}>
          <Text style={styles.stateText}>Egress Lights: {isOn ? 'ILLUMINATED' : 'OFF'}</Text>
          <TouchableOpacity
            style={[styles.btn, isOn ? styles.btnSafe : styles.btnPrimary]}
            disabled={loading}
            onPress={() => handleAction(isOn ? 'turn_off_lights' : 'turn_on_lights')}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>{isOn ? 'Turn Off Lights' : 'Turn On Safety Lights'}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (compact) {
    let subtitle = location;
    let actionLabel = 'Control';
    let actionType;
    let parameters = {};

    if (type === 'gas_valve') {
      const isOpen = state.valveOpen !== false;
      subtitle = `${location} · ${isOpen ? 'Open' : 'Closed'}`;
      actionLabel = isOpen ? 'Shut off' : 'Open';
      actionType = isOpen ? 'shutoff_gas' : 'open_gas';
    } else if (type === 'water_valve') {
      const isOpen = state.valveOpen !== false;
      subtitle = `${location} · ${isOpen ? 'Open' : 'Closed'}`;
      actionLabel = isOpen ? 'Shut off' : 'Open';
      actionType = isOpen ? 'shutoff_water' : 'open_water';
    } else if (type === 'heating_thermostat') {
      subtitle = `${location} · Target ${state.targetTemp || 21}°C`;
      actionLabel = 'Setback';
      actionType = 'set_temperature';
      parameters = { targetTemp: 16.0, heatingOn: false };
    } else if (type === 'smart_light') {
      const isOn = !!state.lightOn;
      subtitle = `${location} · ${isOn ? 'On' : 'Off'}`;
      actionLabel = isOn ? 'Turn off' : 'Turn on';
      actionType = isOn ? 'turn_off_lights' : 'turn_on_lights';
    }

    return (
      <View style={[styles.card, styles.compactCard]}>
        <View style={styles.compactIcon}><DeviceIcon size={21} color={COLORS.deviceAccent} strokeWidth={2} /></View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
          <Text style={styles.compactSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.compactButton}
          disabled={loading || !actionType}
          onPress={() => handleAction(actionType, parameters)}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${name}`}
        >
          {loading ? <ActivityIndicator color={COLORS.textPrimary} size="small" /> : <Text style={styles.compactButtonText}>{actionLabel}</Text>}
        </TouchableOpacity>
        {feedback && (
          <View style={[styles.compactFeedback, { borderColor: feedback.success ? COLORS.safe : COLORS.critical }]}>
            <Text style={[styles.feedbackText, { color: feedback.success ? COLORS.safe : COLORS.textDanger }]} numberOfLines={2}>
              {feedback.success ? '✓ ' : '! '}{feedback.message}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.deviceTitleRow}>
          <View style={styles.deviceIcon}><DeviceIcon size={20} color={COLORS.primary} /></View>
          <View>
          <Text style={styles.deviceName}>{name}</Text>
          <View style={styles.locationRow}><MapPin size={12} color={COLORS.textMuted} /><Text style={styles.deviceLocation}>{location}</Text></View>
          </View>
        </View>
        <Text style={styles.deviceId}>{deviceId}</Text>
      </View>

      {renderControl()}

      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            { backgroundColor: feedback.success ? COLORS.safeDark : COLORS.criticalDark }
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              { color: feedback.success ? COLORS.safe : COLORS.textDanger }
            ]}
          >
            {feedback.success ? '✓ ' : '! '} {feedback.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  compactCard: {
    minHeight: 82,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: 14,
    borderRadius: 28,
  },
  compactIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  compactInfo: { flex: 1, minWidth: 0, marginRight: 8 },
  compactName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: COLORS.textPrimary },
  compactSubtitle: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary, marginTop: 2 },
  compactButton: { minWidth: 78, minHeight: 36, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  compactButtonText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  compactFeedback: { flexBasis: '100%', marginTop: 9, padding: 8, borderRadius: 10, borderWidth: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  deviceTitleRow: { flexDirection: 'row', alignItems: 'center' },
  deviceIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  deviceLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 3,
  },
  deviceId: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  actionContainer: {
    marginTop: 8,
  },
  stateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSafe: {
    backgroundColor: COLORS.safeDark,
    borderColor: COLORS.safe,
    borderWidth: 1,
  },
  btnDanger: {
    backgroundColor: COLORS.criticalDark,
    borderColor: COLORS.critical,
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackBanner: {
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
