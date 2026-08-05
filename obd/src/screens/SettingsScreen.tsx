import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import type { UnitSystem } from '../utils/units';

const OPTIONS: Array<{ value: UnitSystem; label: string }> = [
  { value: 'metric', label: 'Metric (km/h, °C)' },
  { value: 'imperial', label: 'Imperial (mph, °F)' },
];

export default function SettingsScreen() {
  const { unitSystem, setUnitSystem } = useSettingsStore();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Units</Text>
      <View style={styles.segmentGroup}>
        {OPTIONS.map((option) => {
          const active = option.value === unitSystem;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setUnitSystem(option.value)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14', paddingTop: 24, paddingHorizontal: 20 },
  sectionLabel: {
    color: '#8A94A6',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  segmentGroup: { gap: 10 },
  segment: {
    backgroundColor: '#151B23',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#151B23',
  },
  segmentActive: { backgroundColor: '#1F2A37', borderColor: '#4DD0E1' },
  segmentText: { color: '#8A94A6', fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#F5F7FA' },
});
