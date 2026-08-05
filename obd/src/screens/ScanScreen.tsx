import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useObdStore } from '../store/obdStore';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { DiscoveredDevice } from '../types';
import { getLastDevice } from '../storage/lastDevice';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export default function ScanScreen({ navigation }: Props) {
  const { devices, scanning, scan, connect, disconnect, connection } = useObdStore();
  const [reconnectTarget, setReconnectTarget] = useState<DiscoveredDevice | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLastDevice().then((last) => {
      if (cancelled) return;
      if (last) {
        const target: DiscoveredDevice = { id: last.id, name: last.name, transport: last.transport };
        setReconnectTarget(target);
        connect(target);
      } else {
        scan();
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connection.state === 'connected') {
      navigation.replace('Dashboard');
    }
  }, [connection.state, navigation]);

  useEffect(() => {
    if (reconnectTarget && connection.state === 'error') {
      setReconnectTarget(null);
      scan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.state, reconnectTarget]);

  const handleConnect = (device: DiscoveredDevice) => {
    connect(device);
  };

  const handleCancelReconnect = async () => {
    setReconnectTarget(null);
    await disconnect();
    scan();
  };

  const reconnecting =
    reconnectTarget !== null &&
    (connection.state === 'connecting' || connection.state === 'initializing');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OBD2 Adapters</Text>
      <Text style={styles.subtitle}>
        {scanning ? 'Scanning for Bluetooth adapters…' : `${devices.length} device(s) found`}
      </Text>

      {reconnecting ? (
        <View style={styles.statusRow}>
          <ActivityIndicator />
          <Text style={styles.statusText}>
            Reconnecting to {reconnectTarget?.name ?? 'adapter'}…
          </Text>
          <TouchableOpacity onPress={handleCancelReconnect} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : connection.state === 'connecting' || connection.state === 'initializing' ? (
        <View style={styles.statusRow}>
          <ActivityIndicator />
          <Text style={styles.statusText}>
            {connection.state === 'connecting' ? 'Connecting…' : 'Initializing adapter…'}
          </Text>
        </View>
      ) : null}

      {connection.state === 'error' && connection.error ? (
        <Text style={styles.error}>{connection.error}</Text>
      ) : null}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.deviceRow} onPress={() => handleConnect(item)}>
            <View>
              <Text style={styles.deviceName}>{item.name ?? 'Unknown device'}</Text>
              <Text style={styles.deviceMeta}>
                {item.transport.toUpperCase()} · {item.id}
                {item.bonded ? ' · paired' : ''}
              </Text>
            </View>
            <Text style={styles.connectLabel}>Connect</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          scanning ? null : <Text style={styles.empty}>No adapters found. Pull to retry.</Text>
        }
      />

      <TouchableOpacity style={styles.scanButton} onPress={scan} disabled={scanning}>
        <Text style={styles.scanButtonText}>{scanning ? 'Scanning…' : 'Rescan'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14', paddingTop: 64, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#F5F7FA' },
  subtitle: { fontSize: 14, color: '#8A94A6', marginTop: 4, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  statusText: { color: '#F5F7FA', marginLeft: 8, flexShrink: 1 },
  cancelButton: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4 },
  cancelText: { color: '#FF6B6B', fontWeight: '600', fontSize: 13 },
  error: { color: '#FF6B6B', marginBottom: 12 },
  list: { paddingBottom: 24 },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151B23',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  deviceName: { color: '#F5F7FA', fontSize: 16, fontWeight: '600' },
  deviceMeta: { color: '#8A94A6', fontSize: 12, marginTop: 2 },
  connectLabel: { color: '#4DD0E1', fontWeight: '600' },
  empty: { color: '#8A94A6', textAlign: 'center', marginTop: 40 },
  scanButton: {
    backgroundColor: '#1F2A37',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  scanButtonText: { color: '#F5F7FA', fontWeight: '600' },
});
