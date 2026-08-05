import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnitSystem, saveUnitSystem } from '../unitPreference';

describe('unitPreference storage', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to metric when nothing is stored', async () => {
    expect(await getUnitSystem()).toBe('metric');
  });

  it('round-trips a saved preference', async () => {
    await saveUnitSystem('imperial');
    expect(await getUnitSystem()).toBe('imperial');
  });

  it('round-trips metric explicitly too', async () => {
    await saveUnitSystem('imperial');
    await saveUnitSystem('metric');
    expect(await getUnitSystem()).toBe('metric');
  });

  it('defaults to metric for malformed stored JSON rather than throwing', async () => {
    await AsyncStorage.setItem('obd:unit-system', 'not valid json {');
    await expect(getUnitSystem()).resolves.toBe('metric');
  });
});
