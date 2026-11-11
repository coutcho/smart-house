import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { useSafety } from '../../context/SafetyContext';
import { SensorCard } from '../../components/SensorCard';
import { COLORS } from '../../theme/colors';
import { Radio } from 'lucide-react-native';

const FILTERS = ['ALL', 'GAS', 'SMOKE', 'TEMPERATURE', 'WATER'];

export const SensorsScreen = () => {
  const { sensors, isRefreshing, refresh } = useSafety();
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const filteredSensors = sensors.filter((s) => {
    if (selectedFilter === 'ALL') return true;
    return s.type?.toUpperCase() === selectedFilter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.screenHeading}><View style={styles.headingIcon}><Radio size={19} color={COLORS.primary} /></View><View><Text style={styles.headingTitle}>Sensors</Text><Text style={styles.headingSubtitle}>Live environmental monitoring</Text></View></View>
      <View style={styles.filterScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const isSelected = selectedFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedFilter(f)}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <Text style={styles.summaryText}>
          Displaying {filteredSensors.length} of {sensors.length} monitored sensors
        </Text>

        {filteredSensors.map((sensor) => (
          <SensorCard key={sensor.sensorId} sensor={sensor} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterScrollWrapper: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceHighlight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  screenHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  headingIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  headingTitle: { fontSize: 21, fontWeight: '800', color: COLORS.textPrimary },
  headingSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
