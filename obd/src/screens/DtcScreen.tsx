import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useObdStore } from '../store/obdStore';

export default function DtcScreen() {
  const { dtcs, refreshDtcs, clearDtcs, lastError } = useObdStore();
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    refreshDtcs();
  }, [refreshDtcs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDtcs();
    setRefreshing(false);
  }, [refreshDtcs]);

  const onClear = () => {
    Alert.alert(
      'Clear all trouble codes?',
      'This also resets the MIL and stored freeze-frame data on the vehicle. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear codes',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearDtcs();
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trouble Codes</Text>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <FlatList
        data={dtcs}
        keyExtractor={(item, idx) => `${item.code}-${item.status}-${idx}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5F7FA" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.code}>{item.code}</Text>
              <View style={[styles.badge, item.status === 'pending' && styles.badgePending]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No trouble codes reported.</Text>}
      />

      <TouchableOpacity
        style={[styles.clearButton, (clearing || dtcs.length === 0) && styles.clearButtonDisabled]}
        onPress={onClear}
        disabled={clearing || dtcs.length === 0}
      >
        <Text style={styles.clearButtonText}>{clearing ? 'Clearing…' : 'Clear Codes'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14', paddingTop: 64, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#F5F7FA', marginBottom: 16 },
  error: { color: '#FF6B6B', marginBottom: 12 },
  list: { paddingBottom: 24 },
  row: { backgroundColor: '#151B23', borderRadius: 12, padding: 16, marginBottom: 10 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { color: '#F5F7FA', fontSize: 18, fontWeight: '700' },
  badge: { backgroundColor: '#2A1418', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgePending: { backgroundColor: '#2A2414' },
  badgeText: { color: '#FF6B6B', fontSize: 11, textTransform: 'uppercase' },
  description: { color: '#B4BCC8', marginTop: 6, fontSize: 14 },
  empty: { color: '#8A94A6', textAlign: 'center', marginTop: 40 },
  clearButton: {
    backgroundColor: '#3A1620',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  clearButtonDisabled: { opacity: 0.4 },
  clearButtonText: { color: '#FF6B6B', fontWeight: '700' },
});
