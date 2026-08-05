import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearLastDevice, getLastDevice, saveLastDevice } from '../lastDevice';

describe('lastDevice storage', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing is stored', async () => {
    expect(await getLastDevice()).toBeNull();
  });

  it('round-trips a saved device', async () => {
    await saveLastDevice({ id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' });
    expect(await getLastDevice()).toEqual({ id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' });
  });

  it('clears the stored device', async () => {
    await saveLastDevice({ id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' });
    await clearLastDevice();
    expect(await getLastDevice()).toBeNull();
  });

  it('returns null for malformed stored JSON rather than throwing', async () => {
    await AsyncStorage.setItem('obd:last-device', 'not valid json {');
    await expect(getLastDevice()).resolves.toBeNull();
  });
});
