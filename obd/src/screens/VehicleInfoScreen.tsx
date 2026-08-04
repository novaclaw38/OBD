import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useObdStore } from '../store/obdStore';

export default function VehicleInfoScreen() {
  const { vehicleInfo, loadVehicleInfo } = useObdStore();

  useEffect(() => {
    loadVehicleInfo();
  }, [loadVehicleInfo]);

  if (!vehicleInfo) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F5F7FA" />
        <Text style={styles.loading}>Reading VIN…</Text>
      </View>
    );
  }

  const rows: Array<[string, string]> = [
    ['VIN', vehicleInfo.vin ?? 'Not available'],
    ['Make', vehicleInfo.make ?? '—'],
    ['Model', vehicleInfo.model ?? '—'],
    ['Model Year', vehicleInfo.modelYear ?? '—'],
    ['Manufacturer', vehicleInfo.manufacturer ?? '—'],
    ['Fuel Type', vehicleInfo.fuelType ?? '—'],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle Info</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
      <Text style={styles.sourceNote}>
        {vehicleInfo.source === 'vpic-online' && 'Decoded via NHTSA vPIC (live lookup)'}
        {vehicleInfo.source === 'vpic-cache' && 'Decoded via NHTSA vPIC (cached)'}
        {vehicleInfo.source === 'unavailable' &&
          'VIN not read from vehicle, or lookup unavailable offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14', paddingTop: 64, paddingHorizontal: 20 },
  center: { flex: 1, backgroundColor: '#0B0F14', alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#8A94A6', marginTop: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#F5F7FA', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2A37',
  },
  label: { color: '#8A94A6', fontSize: 14 },
  value: { color: '#F5F7FA', fontSize: 14, fontWeight: '600' },
  sourceNote: { color: '#5C6779', fontSize: 12, marginTop: 20 },
});
