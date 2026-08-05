import { create } from 'zustand';
import type { UnitSystem } from '../utils/units';
import { getUnitSystem, saveUnitSystem } from '../storage/unitPreference';

interface SettingsStoreState {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => Promise<void>;
  loadUnitSystem: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  unitSystem: 'metric',

  setUnitSystem: async (system: UnitSystem) => {
    set({ unitSystem: system });
    await saveUnitSystem(system);
  },

  loadUnitSystem: async () => {
    const system = await getUnitSystem();
    set({ unitSystem: system });
  },
}));
