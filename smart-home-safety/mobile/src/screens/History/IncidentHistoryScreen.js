import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { api } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { Clock3, ClipboardCheck } from 'lucide-react-native';

export const IncidentHistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getAlertHistory();
      if (res && res.success) {
        setHistory(res.alerts || []);
      }
    } catch (err) {
      console.warn('Failed to load incident history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchHistory}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      <View style={styles.screenHeading}><View style={styles.headingIcon}><Clock3 size={19} color={COLORS.primary} /></View><View><Text style={styles.headerTitle}>Incident history</Text><Text style={styles.headingSubtitle}>{history.length} archived reports</Text></View></View>

      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <ClipboardCheck size={34} color={COLORS.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Past Incidents</Text>
          <Text style={styles.emptySubtitle}>All safety incident archives will appear here.</Text>
        </View>
      ) : (
        history.map((item) => (
          <View key={item.alertId} style={styles.historyCard}>
            <View style={styles.topRow}>
              <Text style={styles.typeTag}>{(item.sensorType || 'hazard').toUpperCase()}</Text>
              <Text style={styles.resolvedBadge}>RESOLVED</Text>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.details}>
              Location: {item.location} | Trigger Value: {item.triggerValue} {item.unit}
            </Text>

            {item.resolutionNotes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Resolution Notes:</Text>
                <Text style={styles.notesText}>{item.resolutionNotes}</Text>
              </View>
            ) : null}

            <View style={styles.footerRow}>
              <Text style={styles.dateText}>
                Date: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.dateText}>
                Resolved By: {item.resolvedBy || 'Resident'}
              </Text>
            </View>
          </View>
        ))
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
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeTag: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  resolvedBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.safe,
    backgroundColor: COLORS.safeDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  notesBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
