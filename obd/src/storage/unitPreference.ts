import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UnitSystem } from '../utils/units';

/**
 * Persists the user's metric/imperial preference. Unlike lastDevice.ts,
 * there's no meaningful "unset" state for a binary preference — every
 * caller needs a concrete UnitSystem, so this defaults to 'metric'.
 */
const STORAGE_KEY = 'obd:unit-system';

export async function getUnitSystem(): Promise<UnitSystem> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'metric' || raw === 'imperial') return raw;
  return 'metric';
}

export async function saveUnitSystem(system: UnitSystem): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, system);
}
