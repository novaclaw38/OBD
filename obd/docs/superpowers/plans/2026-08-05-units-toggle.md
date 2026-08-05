# Units Toggle (Metric/Imperial) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted metric/imperial toggle affecting speed and temperature display on the dashboard, via a new minimal Settings screen, without touching the OBD decode layer.

**Architecture:** Conversion is a pure display-layer concern (`src/utils/units.ts`), unit preference persists via a small AsyncStorage-backed module (`src/storage/unitPreference.ts`, mirroring the existing `lastDevice.ts` pattern exactly), and a new standalone Zustand store (`src/store/settingsStore.ts`) holds the live preference in memory. `SettingsScreen` writes to the store; `DashboardScreen` reads from it. `ObdService`/`pids.ts` are untouched.

**Tech Stack:** TypeScript, React Native, Zustand, `@react-native-async-storage/async-storage` (already a dependency, already globally mocked in `jest.setup.js`), Jest, React Navigation.

## Global Constraints

- Only PID `0D` (SPEED, km/h↔mph) and PIDs `05`/`0F` (COOLANT_TEMP/INTAKE_AIR_TEMP, °C↔°F) convert. Every other PID passes through unchanged — no exceptions, no pressure/MAF/percent/voltage conversion.
- `ObdService`, `src/obd/pids.ts` decode functions, and any Mode 01/03/04/07/09 logic are not touched by this plan.
- Rounding: `mph = Math.round(kmh * 0.621371)`, `fahrenheit = Math.round(celsius * 9/5 + 32)`. Use these exact formulas and `Math.round` (not `round1`/one-decimal — the existing raw values are already whole numbers, converted values should stay whole numbers too).
- Storage key for the preference: `obd:unit-system`. Default (unset or malformed): `'metric'`.
- Follow existing code style: dark palette (`#0B0F14` background, `#F5F7FA` primary text, `#8A94A6` secondary text, `#1F2A37` secondary-button background, `#4DD0E1` accent) — match it, don't invent a new palette.
- No new screen-level tests (`DashboardScreen.tsx`, `SettingsScreen.tsx` are not covered) — matches the scope decision already made in sub-project 2. Storage, utils, and store logic get tests.

---

### Task 1: Unit conversion helpers

**Files:**
- Create: `src/utils/units.ts`
- Test: `src/utils/__tests__/units.test.ts`

**Interfaces:**
- Consumes: `LiveDataSample` type from `../types` (existing: `{ pid: string; name: string; value: number | string; unit: string; timestamp: number }`).
- Produces:
  - `export type UnitSystem = 'metric' | 'imperial';`
  - `export function formatSpeed(kmh: number, system: UnitSystem): { value: number; unit: string }`
  - `export function formatTemp(celsius: number, system: UnitSystem): { value: number; unit: string }`
  - `export function formatSampleValue(sample: LiveDataSample, system: UnitSystem): { value: number | string; unit: string }`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/units.test.ts`:

```ts
import { formatSampleValue, formatSpeed, formatTemp } from '../units';
import type { LiveDataSample } from '../../types';

describe('formatSpeed', () => {
  it('passes through unchanged for metric', () => {
    expect(formatSpeed(100, 'metric')).toEqual({ value: 100, unit: 'km/h' });
  });

  it('converts to whole-number mph for imperial', () => {
    expect(formatSpeed(100, 'imperial')).toEqual({ value: 62, unit: 'mph' });
  });

  it('rounds to nearest whole number', () => {
    expect(formatSpeed(1, 'imperial')).toEqual({ value: 1, unit: 'mph' }); // 0.621371 rounds to 1
  });
});

describe('formatTemp', () => {
  it('passes through unchanged for metric', () => {
    expect(formatTemp(20, 'metric')).toEqual({ value: 20, unit: '°C' });
  });

  it('converts to whole-number Fahrenheit for imperial', () => {
    expect(formatTemp(20, 'imperial')).toEqual({ value: 68, unit: '°F' });
  });

  it('handles negative Celsius correctly', () => {
    expect(formatTemp(-40, 'imperial')).toEqual({ value: -40, unit: '°F' }); // -40C == -40F
  });
});

describe('formatSampleValue', () => {
  const sample = (pid: string, value: number | string, unit: string): LiveDataSample => ({
    pid,
    name: 'TEST',
    value,
    unit,
    timestamp: 0,
  });

  it('converts SPEED (0D) using formatSpeed', () => {
    expect(formatSampleValue(sample('0D', 100, 'km/h'), 'imperial')).toEqual({
      value: 62,
      unit: 'mph',
    });
  });

  it('converts COOLANT_TEMP (05) using formatTemp', () => {
    expect(formatSampleValue(sample('05', 20, '°C'), 'imperial')).toEqual({
      value: 68,
      unit: '°F',
    });
  });

  it('converts INTAKE_AIR_TEMP (0F) using formatTemp', () => {
    expect(formatSampleValue(sample('0F', 20, '°C'), 'imperial')).toEqual({
      value: 68,
      unit: '°F',
    });
  });

  it('passes through an unaffected PID unchanged regardless of system', () => {
    expect(formatSampleValue(sample('0C', 1726, 'rpm'), 'imperial')).toEqual({
      value: 1726,
      unit: 'rpm',
    });
  });

  it('passes through a string-valued sample unchanged', () => {
    expect(formatSampleValue(sample('99', 'N/A', ''), 'imperial')).toEqual({
      value: 'N/A',
      unit: '',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/__tests__/units.test.ts`
Expected: FAIL with "Cannot find module '../units'" — the module doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/units.ts`:

```ts
import type { LiveDataSample } from '../types';

/**
 * Display-layer unit conversion. ObdService/pids.ts always decode raw SI
 * values (km/h, °C) — conversion only happens here, at render time.
 */
export type UnitSystem = 'metric' | 'imperial';

export function formatSpeed(kmh: number, system: UnitSystem): { value: number; unit: string } {
  if (system === 'metric') return { value: kmh, unit: 'km/h' };
  return { value: Math.round(kmh * 0.621371), unit: 'mph' };
}

export function formatTemp(celsius: number, system: UnitSystem): { value: number; unit: string } {
  if (system === 'metric') return { value: celsius, unit: '°C' };
  return { value: Math.round((celsius * 9) / 5 + 32), unit: '°F' };
}

export function formatSampleValue(
  sample: LiveDataSample,
  system: UnitSystem,
): { value: number | string; unit: string } {
  if (sample.pid === '0D' && typeof sample.value === 'number') {
    return formatSpeed(sample.value, system);
  }
  if ((sample.pid === '05' || sample.pid === '0F') && typeof sample.value === 'number') {
    return formatTemp(sample.value, system);
  }
  return { value: sample.value, unit: sample.unit };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/__tests__/units.test.ts -v`
Expected: PASS, all 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/units.ts src/utils/__tests__/units.test.ts
git commit -m "feat: add metric/imperial unit conversion helpers"
```

---

### Task 2: `unitPreference` storage module

**Files:**
- Create: `src/storage/unitPreference.ts`
- Test: `src/storage/__tests__/unitPreference.test.ts`

**Interfaces:**
- Consumes: `AsyncStorage` from `@react-native-async-storage/async-storage` (already globally mocked in `jest.setup.js`); `UnitSystem` type from `../utils/units` (Task 1).
- Produces:
  - `export async function getUnitSystem(): Promise<UnitSystem>` — defaults to `'metric'`.
  - `export async function saveUnitSystem(system: UnitSystem): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `src/storage/__tests__/unitPreference.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/storage/__tests__/unitPreference.test.ts`
Expected: FAIL with "Cannot find module '../unitPreference'".

- [ ] **Step 3: Write minimal implementation**

Create `src/storage/unitPreference.ts`:

```ts
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
```

Note: unlike `lastDevice.ts`, this stores the raw string directly (no
`JSON.stringify`/`JSON.parse`) since `UnitSystem` is already a plain string
type — no object serialization needed. `getUnitSystem` validates the raw
value is exactly `'metric'` or `'imperial'` before trusting it, which is
what makes malformed/garbage stored values fall through to the `'metric'`
default without needing a try/catch.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/storage/__tests__/unitPreference.test.ts -v`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/storage/unitPreference.ts src/storage/__tests__/unitPreference.test.ts
git commit -m "feat: add unitPreference storage for the metric/imperial setting"
```

---

### Task 3: `settingsStore`

**Files:**
- Create: `src/store/settingsStore.ts`
- Test: `src/store/__tests__/settingsStore.test.ts`

**Interfaces:**
- Consumes: `getUnitSystem`, `saveUnitSystem` from `../storage/unitPreference` (Task 2); `UnitSystem` from `../utils/units` (Task 1).
- Produces: `export const useSettingsStore: UseBoundStore<StoreApi<SettingsStoreState>>` where
  `SettingsStoreState = { unitSystem: UnitSystem; setUnitSystem: (system: UnitSystem) => Promise<void>; loadUnitSystem: () => Promise<void>; }`.

- [ ] **Step 1: Write the failing tests**

Create `src/store/__tests__/settingsStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/store/__tests__/settingsStore.test.ts`
Expected: FAIL with "Cannot find module '../settingsStore'".

- [ ] **Step 3: Write minimal implementation**

Create `src/store/settingsStore.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/store/__tests__/settingsStore.test.ts -v`
Expected: PASS, all 4 tests.

Also run the full suite:

Run: `npx jest`
Expected: PASS, all suites.

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts src/store/__tests__/settingsStore.test.ts
git commit -m "feat: add settingsStore for the metric/imperial preference"
```

---

### Task 4: `SettingsScreen`, navigation registration, app-startup load

**Files:**
- Create: `src/screens/SettingsScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (add route)
- Modify: `App.tsx` (load preference on startup)

**Interfaces:**
- Consumes: `useSettingsStore` (Task 3); `RootStackParamList` from `../navigation/RootNavigator` (existing, gains one member this task).
- Produces: `SettingsScreen` default export (no props beyond standard `NativeStackScreenProps<RootStackParamList, 'Settings'>`); `RootStackParamList` gains `Settings: undefined;`.

- [ ] **Step 1: Manual verification plan (no automated screen tests per Global Constraints)**

Verification for this task: full suite still passes (no regressions), `tsc --noEmit` clean, and a manual read-through checklist recorded in the implementer's report:
1. `RootNavigator` registers `Settings` with `headerShown: true, title: 'Settings'`, matching the `Dtc`/`VehicleInfo` pattern.
2. `App.tsx` calls `useSettingsStore.getState().loadUnitSystem()` exactly once, on mount (not on every render).
3. `SettingsScreen` renders two options (Metric, Imperial); the currently-active one is visually distinguished from the inactive one; tapping the inactive one calls `setUnitSystem` with that option's value.
4. `SettingsScreen` reflects `useSettingsStore`'s current `unitSystem` on every render (not just at mount) — i.e. it uses the hook's live value, not a local copy that could go stale.

- [ ] **Step 2: Implement**

Create `src/screens/SettingsScreen.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import type { UnitSystem } from '../utils/units';

const OPTIONS: Array<{ value: UnitSystem; label: string }> = [
  { value: 'metric', label: 'Metric (km/h, °C)' },
  { value: 'imperial', label: 'Imperial (mph, °F)' },
];

export default function SettingsScreen() {
  const { unitSystem, setUnitSystem } = useSettingsStore();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Units</Text>
      <View style={styles.segmentGroup}>
        {OPTIONS.map((option) => {
          const active = option.value === unitSystem;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setUnitSystem(option.value)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14', paddingTop: 24, paddingHorizontal: 20 },
  sectionLabel: {
    color: '#8A94A6',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  segmentGroup: { gap: 10 },
  segment: {
    backgroundColor: '#151B23',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#151B23',
  },
  segmentActive: { backgroundColor: '#1F2A37', borderColor: '#4DD0E1' },
  segmentText: { color: '#8A94A6', fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#F5F7FA' },
});
```

In `src/navigation/RootNavigator.tsx`, add the import:

```ts
import SettingsScreen from '../screens/SettingsScreen';
```

Add `Settings: undefined;` to `RootStackParamList`, after the existing `VehicleInfo: undefined;` line.

Add the screen registration, after the existing `VehicleInfo` `Stack.Screen`:

```tsx
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: 'Settings' }}
        />
```

In `App.tsx`, add the startup load. Replace the full file contents:

```tsx
import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { useSettingsStore } from './src/store/settingsStore';

export default function App() {
  useEffect(() => {
    useSettingsStore.getState().loadUnitSystem();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F14" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
```

- [ ] **Step 3: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: PASS, all suites (this task adds no new test files, so the count should match Task 3's).

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx src/navigation/RootNavigator.tsx App.tsx
git commit -m "feat: add SettingsScreen with a metric/imperial toggle"
```

---

### Task 5: DashboardScreen integration

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `formatSampleValue` from `../utils/units` (Task 1); `useSettingsStore` (Task 3).
- Produces: no new exports — leaf screen component.

- [ ] **Step 1: Manual verification plan (no automated screen tests per Global Constraints)**

1. Each PID card renders via `formatSampleValue(sample, unitSystem)` instead of raw `sample.value`/`sample.unit` — confirm by reading the diff, for every PID in `LIVE_DASHBOARD_PIDS` (not just speed/temp — the pass-through path must still render `04`/`0C`/`11`/`2F`/`42` exactly as before).
2. A new "Settings" button exists in the `navRow`, navigating to `'Settings'`.
3. When no sample exists yet for a PID, the card still renders `'—'` (unchanged empty-state behavior) — `formatSampleValue` must not be called with an undefined sample.

- [ ] **Step 2: Implement**

In `src/screens/DashboardScreen.tsx`, add imports:

```ts
import { useSettingsStore } from '../store/settingsStore';
import { formatSampleValue } from '../utils/units';
```

Change the destructure at the top of the component to also read `unitSystem`:

```ts
  const { liveData, refreshLiveData, connection, disconnect, forgetDevice } = useObdStore();
  const { unitSystem } = useSettingsStore();
```

Replace the PID card rendering block (the `styles.grid` `View` and its `.map`):

```tsx
      <View style={styles.grid}>
        {LIVE_DASHBOARD_PIDS.map((pid) => {
          const sample = liveData[pid];
          const display = sample ? formatSampleValue(sample, unitSystem) : null;
          return (
            <View key={pid} style={styles.card}>
              <Text style={styles.cardLabel}>{sample?.name ?? pid}</Text>
              <Text style={styles.cardValue}>
                {display ? String(display.value) : '—'}
                <Text style={styles.cardUnit}> {display?.unit ?? ''}</Text>
              </Text>
            </View>
          );
        })}
      </View>
```

Add a "Settings" button to the existing `navRow`, after the "Vehicle Info" button:

```tsx
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navButtonText}>Settings</Text>
        </TouchableOpacity>
```

- [ ] **Step 3: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: PASS, all suites, same count as after Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: render dashboard PIDs through the unit-aware formatter"
```

---

## Self-Review Notes

- **Spec coverage:** conversion helpers → Task 1. Storage → Task 2. Store → Task 3. Settings screen + navigation + startup load → Task 4. Dashboard integration → Task 5. All spec sections covered.
- **Placeholder scan:** no TBD/TODO; every step has literal code or a concrete manual-verification checklist (used only where Global Constraints explicitly rule out automated screen tests, matching sub-project 2's precedent).
- **Type consistency:** `UnitSystem` (Task 1) is used identically in Task 2 (`unitPreference.ts`), Task 3 (`settingsStore.ts`), and Task 4 (`SettingsScreen.tsx`'s `OPTIONS` array). `formatSampleValue`'s return shape (`{ value: number | string; unit: string }`) is what Task 5 destructures (`display.value`/`display.unit`) — consistent everywhere. `useSettingsStore`'s state shape (`unitSystem`, `setUnitSystem`, `loadUnitSystem`) is defined once in Task 3 and consumed identically in Tasks 4 and 5.
