import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert
} from 'react-native';
import { api } from '../../services/api';
import { useSafety } from '../../context/SafetyContext';
import { COLORS } from '../../theme/colors';
import { Siren, Phone, Zap, CircleAlert, Check, ChevronRight } from 'lucide-react-native';

export const EmergencyResponseScreen = ({ route, navigation }) => {
  const { alertId } = route.params || {};
  const { executeAction, acknowledgeAlert, resolveAlert } = useSafety();

  const [loading, setLoading] = useState(true);
  const [alertData, setAlertData] = useState(null);
  const [responsePlan, setResponsePlan] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionConfirmed, setActionConfirmed] = useState(null);
  const [ackLoading, setAckLoading] = useState(false);

  useEffect(() => {
    fetchResponsePlan();
  }, [alertId]);

  const fetchResponsePlan = async () => {
    if (!alertId) return;
    setLoading(true);
    try {
      const res = await api.getEmergencyResponse(alertId);
      if (res && res.success) {
        setAlertData(res.alert);
        setResponsePlan(res.responsePlan);
      }
    } catch (err) {
      Alert.alert('Error', `Could not load emergency plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDial = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Emergency Dial', `Please call ${number} directly.`);
    });
  };

  const toggleStep = (stepNumber) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const handleExecuteSmartAction = async (action) => {
    setActionLoading(true);
    setActionConfirmed(null);
    try {
      const result = await executeAction({
        deviceId: action.deviceId || (action.actionType.includes('gas') ? 'DEV_GAS_VALVE_01' : 'DEV_WATER_VALVE_01'),
        actionType: action.actionType,
        parameters: action.parameters || {}
      });

      if (result && result.confirmed) {
        setActionConfirmed({
          success: true,
          actionId: result.actionId,
          message: result.message
        });
      } else {
        throw new Error('Device action execution could not be verified by backend.');
      }
    } catch (err) {
      setActionConfirmed({
        success: false,
        message: err.message
      });
      Alert.alert('Action Execution Blocked', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    setAckLoading(true);
    try {
      await acknowledgeAlert(alertId);
      Alert.alert('Acknowledged', 'Incident alert acknowledged.');
      fetchResponsePlan();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAckLoading(false);
    }
  };

  const handleResolve = () => {
    Alert.prompt
      ? Alert.prompt(
          'Resolve Safety Incident',
          'Enter resolution notes (e.g. area ventilated and hazard cleared):',
          async (notes) => {
            try {
              await resolveAlert(alertId, notes);
              Alert.alert('Incident Cleared', 'Incident has been marked resolved.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        )
      : (async () => {
          try {
            await resolveAlert(alertId, 'Hazard inspected and resolved safely.');
            Alert.alert('Incident Cleared', 'Incident has been marked resolved.');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        })();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Emergency Response Protocol...</Text>
      </View>
    );
  }

  if (!responsePlan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No response plan found for this incident.</Text>
      </View>
    );
  }

  const isCritical = responsePlan.severity === 'critical';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Emergency Header Banner */}
      <View style={[styles.headerBanner, isCritical ? styles.headerCritical : styles.headerWarning]}>
        <View style={styles.headerIconRow}>
          <Siren size={24} color={COLORS.critical} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>{responsePlan.title}</Text>
        </View>
        <Text style={styles.headerHeadline}>{responsePlan.headline}</Text>

        {responsePlan.evacuationRequired && (
          <View style={styles.evacBadge}>
            <Text style={styles.evacText}>IMMEDIATE EVACUATION REQUIRED</Text>
          </View>
        )}
      </View>

      {/* Emergency Quick SOS Contacts (Algeria Protection Civile 14 & Sonelgaz 3303) */}
      <View style={styles.sosSection}>
        <Text style={styles.sectionHeader}>Emergency Speed Dial</Text>
        <View style={styles.sosButtonRow}>
          <TouchableOpacity
            style={[styles.sosCallBtn, styles.btnPompiers]}
            onPress={() => handleDial('14')}
          >
            <Phone size={20} color={COLORS.critical} style={styles.sosCallIcon} />
            <View>
              <Text style={styles.sosCallTitle}>Protection Civile (14)</Text>
              <Text style={styles.sosCallSubtitle}>SOS Pompiers / Ambulances</Text>
            </View>
          </TouchableOpacity>

          {responsePlan.incidentType === 'gas' && (
            <TouchableOpacity
              style={[styles.sosCallBtn, styles.btnSonelgaz]}
              onPress={() => handleDial('3303')}
            >
              <Zap size={20} color={COLORS.warning} style={styles.sosCallIcon} />
              <View>
                <Text style={styles.sosCallTitle}>Sonelgaz (3303)</Text>
                <Text style={styles.sosCallSubtitle}>Urgence Fuite de Gaz</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Strict Safety Warnings (Prohibited Actions) */}
      {responsePlan.safetyWarnings && responsePlan.safetyWarnings.length > 0 && (
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}><CircleAlert size={16} color={COLORS.warning} /><Text style={styles.warningBoxHeader}>CRITICAL SAFETY WARNINGS</Text></View>
          {responsePlan.safetyWarnings.map((warning, idx) => (
            <View key={idx} style={styles.warningItem}>
              <Text style={styles.warningBullet}>•</Text>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Dynamic Step-by-Step Response Checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Action Checklist (Follow in Order)</Text>
        {responsePlan.instructions.map((inst) => {
          const isDone = !!completedSteps[inst.step];
          return (
            <TouchableOpacity
              key={inst.step}
              style={[styles.stepItem, isDone && styles.stepItemDone]}
              onPress={() => toggleStep(inst.step)}
              activeOpacity={0.7}
            >
              <View style={[styles.stepCheckbox, isDone && styles.stepCheckboxDone]}>
                {isDone ? <Check size={16} color={COLORS.safe} /> : <Text style={styles.checkText}>{inst.step}</Text>}
              </View>
              <Text
                style={[
                  styles.stepText,
                  inst.isCritical && styles.stepTextCritical,
                  isDone && styles.stepTextDone
                ]}
              >
                {inst.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Available Smart Actuator Actions with Strict Confirmation */}
      {responsePlan.availableActions && responsePlan.availableActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Mitigation Device Controls</Text>
          {responsePlan.availableActions.map((action, idx) => (
            <View key={idx} style={styles.actionCard}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDesc}>{action.description}</Text>

              <TouchableOpacity
                style={[styles.btnExecute, actionLoading && styles.btnDisabled]}
                disabled={actionLoading}
                onPress={() => handleExecuteSmartAction(action)}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.btnExecuteText}>Execute now · backend confirmed</Text>
                    <ChevronRight size={17} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}

          {/* Backend Confirmation Feedback Banner */}
          {actionConfirmed && (
            <View
              style={[
                styles.confirmationBanner,
                { backgroundColor: actionConfirmed.success ? COLORS.safeDark : COLORS.criticalDark }
              ]}
            >
              <Text
                style={[
                  styles.confirmationText,
                  { color: actionConfirmed.success ? COLORS.safe : COLORS.textDanger }
                ]}
              >
                {actionConfirmed.success ? '✔ BACKEND CONFIRMED: ' : '✖ EXECUTION FAILED: '}
                {actionConfirmed.message}
              </Text>
              {actionConfirmed.actionId && (
                <Text style={styles.auditIdText}>Audit ID: {actionConfirmed.actionId}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Incident Status & Resolution Management */}
      <View style={styles.mgmtRow}>
        <TouchableOpacity
          style={styles.btnAck}
          disabled={ackLoading}
          onPress={handleAcknowledge}
        >
          {ackLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnAckText}>Acknowledge Alert</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnResolve} onPress={handleResolve}>
          <Text style={styles.btnResolveText}>Mark Resolved</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.textDanger,
    fontSize: 15,
  },
  headerBanner: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  headerCritical: {
    backgroundColor: COLORS.criticalDark,
    borderColor: COLORS.critical,
  },
  headerWarning: {
    backgroundColor: COLORS.warningDark,
    borderColor: COLORS.warning,
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    flex: 1,
  },
  headerHeadline: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
    opacity: 0.95,
  },
  evacBadge: {
    backgroundColor: COLORS.sosRed,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  evacText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sosSection: {
    marginBottom: 16,
  },
  sosButtonRow: {
    marginTop: 6,
  },
  sosCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  btnPompiers: {
    backgroundColor: COLORS.sosRed,
  },
  btnSonelgaz: {
    backgroundColor: '#D97706',
  },
  sosCallIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  sosCallTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  sosCallSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  warningBox: {
    backgroundColor: '#381313',
    borderColor: COLORS.critical,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningBoxHeader: {
    color: COLORS.critical,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  warningBullet: {
    color: COLORS.critical,
    fontSize: 14,
    marginRight: 6,
    fontWeight: '900',
  },
  warningText: {
    color: '#FEE2E2',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  stepItemDone: {
    backgroundColor: '#0F291E',
    borderColor: COLORS.safe,
  },
  stepCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepCheckboxDone: {
    backgroundColor: COLORS.safe,
    borderColor: COLORS.safe,
  },
  checkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  stepTextCritical: {
    fontWeight: '700',
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  actionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  actionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 6,
  },
  btnExecute: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnExecuteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmationBanner: {
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  confirmationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  auditIdText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  mgmtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  btnAck: {
    flex: 1,
    backgroundColor: COLORS.surfaceHighlight,
    borderColor: COLORS.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  btnAckText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  btnResolve: {
    flex: 1,
    backgroundColor: COLORS.safeDark,
    borderColor: COLORS.safe,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  btnResolveText: {
    color: COLORS.safe,
    fontSize: 13,
    fontWeight: '700',
  },
});
