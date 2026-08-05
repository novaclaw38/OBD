import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../settingsStore';

describe('settingsStore', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({ unitSystem: 'metric' });
  });

  it('defaults to metric before loadUnitSystem is called', () => {
    expect(useSettingsStore.getState().unitSystem).toBe('metric');
  });

  it('setUnitSystem updates state and persists', async () => {
    await useSettingsStore.getState().setUnitSystem('imperial');

    expect(useSettingsStore.getState().unitSystem).toBe('imperial');
    expect(await AsyncStorage.getItem('obd:unit-system')).toBe('imperial');
  });

  it('loadUnitSystem hydrates state from storage', async () => {
    await AsyncStorage.setItem('obd:unit-system', 'imperial');

    await useSettingsStore.getState().loadUnitSystem();

    expect(useSettingsStore.getState().unitSystem).toBe('imperial');
  });

  it('loadUnitSystem defaults to metric when nothing is stored', async () => {
    await useSettingsStore.getState().loadUnitSystem();

    expect(useSettingsStore.getState().unitSystem).toBe('metric');
  });
});
