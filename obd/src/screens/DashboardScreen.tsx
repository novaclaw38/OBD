import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useObdStore } from '../store/obdStore';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { LIVE_DASHBOARD_PIDS } from '../obd/pids';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const POLL_INTERVAL_MS = 1500;

export default function DashboardScreen({ navigation }: Props) {
  const { liveData, refreshLiveData, connection, disconnect, forgetDevice } = useObdStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (connection.state !== 'connected') return;
    intervalRef.current = setInterval(() => {
      refreshLiveData();
    }, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connection.state, refreshLiveData]);

  useEffect(() => {
    if (connection.state === 'error' || connection.state === 'disconnected') {
      navigation.replace('Scan');
    }
  }, [connection.state, navigation]);

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleForget = async () => {
    await forgetDevice();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Data</Text>
          <Text style={styles.subtitle}>
            {connection.device?.name ?? 'Adapter'} · Protocol {connection.protocol ?? '—'}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleForget} style={styles.forgetButton}>
            <Text style={styles.forgetText}>Forget adapter</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.grid}>
        {LIVE_DASHBOARD_PIDS.map((pid) => {
          const sample = liveData[pid];
          return (
            <View key={pid} style={styles.card}>
              <Text style={styles.cardLabel}>{sample?.name ?? pid}</Text>
              <Text style={styles.cardValue}>
                {sample ? String(sample.value) : '—'}
                <Text style={styles.cardUnit}> {sample?.unit ?? ''}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Dtc')}>
          <Text style={styles.navButtonText}>Diagnostic Trouble Codes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('VehicleInfo')}
        >
          <Text style={styles.navButtonText}>Vehicle Info</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14' },
  content: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 26, fontWeight: '700', color: '#F5F7FA' },
  subtitle: { fontSize: 13, color: '#8A94A6', marginTop: 4 },
  disconnectButton: {
    backgroundColor: '#2A1418',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  disconnectText: { color: '#FF6B6B', fontWeight: '600', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  forgetButton: {
    backgroundColor: '#1F2A37',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  forgetText: { color: '#8A94A6', fontWeight: '600', fontSize: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  card: {
    width: '48%',
    backgroundColor: '#151B23',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: { color: '#8A94A6', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { color: '#F5F7FA', fontSize: 28, fontWeight: '700', marginTop: 8 },
  cardUnit: { fontSize: 14, color: '#8A94A6', fontWeight: '400' },
  navRow: { marginTop: 12, gap: 10 },
  navButton: {
    backgroundColor: '#1F2A37',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navButtonText: { color: '#F5F7FA', fontWeight: '600' },
});
