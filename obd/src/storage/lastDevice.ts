import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveredDevice } from '../types';

/**
 * Persists the last successfully-connected OBD2 adapter so the app can
 * auto-reconnect to it on the next launch without a fresh scan.
 */
export type LastDevice = Pick<DiscoveredDevice, 'id' | 'name' | 'transport'>;

const STORAGE_KEY = 'obd:last-device';

export async function getLastDevice(): Promise<LastDevice | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastDevice;
  } catch {
    return null;
  }
}

export async function saveLastDevice(device: LastDevice): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(device));
}

export async function clearLastDevice(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
