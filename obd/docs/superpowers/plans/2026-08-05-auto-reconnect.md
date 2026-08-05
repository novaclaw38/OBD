# Auto-Reconnect / Remembered Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remember the last successfully-connected OBD2 adapter and auto-reconnect to it directly (no scan) on app launch, with a Cancel option during the attempt and a "Forget adapter" action to clear the memory.

**Architecture:** A small standalone storage module (`src/storage/lastDevice.ts`) wraps AsyncStorage, following the exact pattern `src/vehicleData/vpic.ts` already uses. The store (`src/store/obdStore.ts`) writes to it on every successful connect and exposes a `forgetDevice()` action. `ScanScreen` reads it once on mount to decide whether to auto-connect or scan normally; `DashboardScreen` gets one new button wired to `forgetDevice()`.

**Tech Stack:** TypeScript, React Native, Zustand, `@react-native-async-storage/async-storage` (already a dependency, already globally mocked in `jest.setup.js`), Jest.

## Global Constraints

- Auto-reconnect triggers only when `ScanScreen` mounts with a remembered device present — no auto-retry after a manual disconnect.
- Reconnect attempt is single-shot: on failure or cancel, fall through to a normal scan. No retry/backoff loop.
- `forgetDevice()` only clears storage — it must never change `connection` state or touch `manager`/`service`.
- No changes to `BluetoothManager`, `ObdService`, or any Mode 01/03/04/07/09 logic — this sub-project is UI/store/storage only.
- No new screen-level tests (the codebase has none yet; that's sub-project 6's scope). Storage and store logic get tests; screens do not.
- Follow existing code style: the codebase's screens use `StyleSheet.create` with the existing dark palette (`#0B0F14` background, `#F5F7FA` primary text, `#8A94A6` secondary text, `#FF6B6B` destructive/accent) — match it, don't invent a new palette.

---

### Task 1: `lastDevice` storage module

**Files:**
- Create: `src/storage/lastDevice.ts`
- Test: `src/storage/__tests__/lastDevice.test.ts`

**Interfaces:**
- Consumes: `AsyncStorage` from `@react-native-async-storage/async-storage` (already globally mocked in `jest.setup.js` via `@react-native-async-storage/async-storage/jest/async-storage-mock`); `DiscoveredDevice` type from `../types`.
- Produces:
  - `export type LastDevice = Pick<DiscoveredDevice, 'id' | 'name' | 'transport'>;`
  - `export async function getLastDevice(): Promise<LastDevice | null>`
  - `export async function saveLastDevice(device: LastDevice): Promise<void>`
  - `export async function clearLastDevice(): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `src/storage/__tests__/lastDevice.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/storage/__tests__/lastDevice.test.ts`
Expected: FAIL with "Cannot find module '../lastDevice'" — the module doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/storage/lastDevice.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/storage/__tests__/lastDevice.test.ts -v`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/storage/lastDevice.ts src/storage/__tests__/lastDevice.test.ts
git commit -m "feat: add lastDevice storage for remembering the connected adapter"
```

---

### Task 2: Store integration — save on connect, `forgetDevice()`

**Files:**
- Modify: `src/store/obdStore.ts:9-11` (imports), `:13-32` (interface), `:59-77` (`connect`), add new action after `disconnect`
- Test: `src/store/__tests__/obdStore.test.ts`

**Interfaces:**
- Consumes: `saveLastDevice`, `clearLastDevice` from `../storage/lastDevice` (Task 1).
- Produces: `forgetDevice: () => Promise<void>` added to `ObdStoreState`. `connect()`'s existing signature and behavior are otherwise unchanged; it gains a side effect (persisting the device) on the success path only.

- [ ] **Step 1: Write the failing tests**

Add to `src/store/__tests__/obdStore.test.ts`, after the existing `jest.mock('../../obd/ObdService');` line, add a second mock and import:

```ts
jest.mock('../../obd/ObdService');

import { useObdStore } from '../obdStore';
import { getLastDevice } from '../../storage/lastDevice';
import type { DiscoveredDevice } from '../../types';
```

Then add a new `describe` block at the end of the file (after the existing `refreshLiveData backpressure` block):

```ts
describe('obdStore remembered-device persistence', () => {
  const device: DiscoveredDevice = { id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const { manager } = useObdStore.getState();
    (manager.connect as jest.Mock).mockResolvedValue({});
    await useObdStore.getState().forgetDevice();
  });

  it('remembers the device after a successful connect', async () => {
    await useObdStore.getState().connect(device);

    expect(await getLastDevice()).toEqual({ id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' });
  });

  it('forgetDevice clears the remembered device without changing connection state', async () => {
    await useObdStore.getState().connect(device);
    const connectionBefore = useObdStore.getState().connection;

    await useObdStore.getState().forgetDevice();

    expect(await getLastDevice()).toBeNull();
    expect(useObdStore.getState().connection).toEqual(connectionBefore);
  });
});
```

Note: `manager` is also part of `ObdStoreState` (an auto-mocked `BluetoothManager` instance, same pattern as `service`), so `manager.connect` is already a `jest.fn()` — mock its resolved value the same way the existing tests mock `service.readLiveDataBatch`. `service.initialize` also needs a resolved value for `connect()` to reach the `'connected'` state — add `(service.initialize as jest.Mock).mockResolvedValue({ protocol: '6' });` in the same `beforeEach`, alongside the `manager.connect` mock and using the same `service` destructured from `useObdStore.getState()`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/store/__tests__/obdStore.test.ts -t "remembered-device persistence"`
Expected: FAIL — `forgetDevice` doesn't exist on the store yet (`useObdStore.getState().forgetDevice is not a function`), and even once that's stubbed, `getLastDevice()` would return `null` after connect since nothing persists it yet.

- [ ] **Step 3: Write minimal implementation**

In `src/store/obdStore.ts`, add the import (near the existing imports at the top):

```ts
import { saveLastDevice, clearLastDevice } from '../storage/lastDevice';
```

Add `forgetDevice: () => Promise<void>;` to the `ObdStoreState` interface, right after `disconnect: () => Promise<void>;`.

Modify `connect()`'s success path — the line `set({ connection: { state: 'connected', device, error: null, protocol } });` — to persist the device right after that `set()` call:

```ts
  connect: async (device: DiscoveredDevice) => {
    set((s) => ({ connection: { ...s.connection, state: 'connecting', device, error: null } }));
    try {
      const transport = await manager.connect(device);
      await service.attach(transport);
      service.onDisconnect((err) => {
        set({
          connection: { state: 'error', device: null, error: err.message, protocol: null },
        });
      });

      set((s) => ({ connection: { ...s.connection, state: 'initializing' } }));
      const { protocol } = await service.initialize();
      set({ connection: { state: 'connected', device, error: null, protocol } });
      await saveLastDevice({ id: device.id, name: device.name, transport: device.transport });
    } catch (e) {
      set({
        connection: { state: 'error', device: null, error: describeError(e), protocol: null },
      });
    }
  },
```

Add the new `forgetDevice` action to the store object, right after `disconnect`:

```ts
  forgetDevice: async () => {
    await clearLastDevice();
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/store/__tests__/obdStore.test.ts -v`
Expected: PASS, all tests in the file (both the pre-existing backpressure tests and the two new ones).

Also run the full suite:

Run: `npx jest`
Expected: PASS, all suites.

- [ ] **Step 5: Commit**

```bash
git add src/store/obdStore.ts src/store/__tests__/obdStore.test.ts
git commit -m "feat: persist and clear the remembered adapter in obdStore"
```

---

### Task 3: ScanScreen auto-reconnect flow

**Files:**
- Modify: `src/screens/ScanScreen.tsx` (whole file — small, shown in full below)

**Interfaces:**
- Consumes: `getLastDevice` from `../storage/lastDevice` (Task 1); `useObdStore` fields `devices`, `scanning`, `scan`, `connect`, `disconnect`, `connection` (all pre-existing, `disconnect` newly used by this task).
- Produces: no new exports — this is a leaf screen component.

- [ ] **Step 1: Manual verification plan (no automated screen tests per Global Constraints)**

Since screens have no test coverage in this codebase and that's out of scope here, verification for this task is: full suite still passes (no regressions in store/storage tests), TypeScript compiles, and a manual read-through against the following behavior checklist (record the check in your report):

1. Mount with `getLastDevice()` resolving a device → `connect()` is called with that device immediately, `scan()` is NOT called, "Reconnecting to `<name>`…" with a Cancel button is shown while `connection.state` is `'connecting'` or `'initializing'`.
2. Mount with `getLastDevice()` resolving `null` → behaves exactly as before (calls `scan()` immediately, no reconnect UI).
3. Pressing Cancel during a reconnect attempt calls `disconnect()`, clears the reconnect UI, and triggers a normal `scan()`.
4. If the reconnect attempt reaches `connection.state === 'error'`, the reconnect UI clears and a normal `scan()` fires, while the existing error text still renders (unchanged existing render logic).
5. A successful reconnect still triggers the pre-existing `navigation.replace('Dashboard')` effect, unchanged.
6. Manually tapping a device in the list (`handleConnect`) is completely unaffected — no interaction with the new local state.

- [ ] **Step 2: Implement**

Replace the full contents of `src/screens/ScanScreen.tsx`:

```tsx
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
```

Notes on this rewrite versus the original file:
- The original single `useEffect(() => { scan(); }, [scan])` on mount is replaced by the `getLastDevice()`-driven effect above — this is the one behavioral change to existing code in this file.
- The original `navigation.replace('Dashboard')` effect is unchanged.
- A new effect clears `reconnectTarget` and falls through to `scan()` when a reconnect attempt errors.
- `handleCancelReconnect` is new. `handleConnect` is unchanged.
- The `statusRow` branch is now two cases (`reconnecting` vs. the original manual-connect `connecting`/`initializing` case) so the reconnect case can show the device name and Cancel button while manual connects keep their original copy.
- Two new styles (`cancelButton`, `cancelText`) and one modified style (`statusText` gains `flexShrink: 1` so long device names don't push the Cancel button off-screen) — everything else in `styles` is copied unchanged from the original file.

- [ ] **Step 3: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: PASS, all suites (this task adds no new test files, so the count should match Task 2's).

- [ ] **Step 4: Commit**

```bash
git add src/screens/ScanScreen.tsx
git commit -m "feat: auto-reconnect to the remembered adapter on ScanScreen mount"
```

---

### Task 4: DashboardScreen "Forget adapter" action

**Files:**
- Modify: `src/screens/DashboardScreen.tsx:12-13` (destructure `forgetDevice`), `:36-48` (header, add button), styles

**Interfaces:**
- Consumes: `forgetDevice` from `useObdStore` (Task 2).
- Produces: no new exports.

- [ ] **Step 1: Manual verification plan (no automated screen tests per Global Constraints)**

Same rationale as Task 3. Verification: full suite passes, `tsc --noEmit` clean, manual read-through: tapping "Forget adapter" calls `forgetDevice()` and does not call `disconnect()`, does not change `connection.state`, and does not navigate away.

- [ ] **Step 2: Implement**

In `src/screens/DashboardScreen.tsx`, change the store destructure at line 13:

```ts
  const { liveData, refreshLiveData, connection, disconnect, forgetDevice } = useObdStore();
```

Add a handler next to the existing `handleDisconnect`:

```ts
  const handleForget = async () => {
    await forgetDevice();
  };
```

In the header `View` (the block containing the `disconnectButton` `TouchableOpacity`), add the new button right after the existing Disconnect button:

```tsx
        <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleForget} style={styles.forgetButton}>
          <Text style={styles.forgetText}>Forget adapter</Text>
        </TouchableOpacity>
```

Note the existing header `View` (`styles.header`) is `flexDirection: 'row'`, so add a wrapping `View` around both buttons if needed to keep them grouped — check the existing JSX structure at implementation time and wrap only if the two buttons would otherwise be pushed apart by `justifyContent: 'space-between'` on `styles.header` (they would be, since `header` splits its two direct children apart). Wrap the two buttons in a `View style={styles.actions}` with `flexDirection: 'row', gap: 8` so they sit together as the header's second child, matching the existing `space-between` layout between the title block and the actions block.

Add two new styles and one new container style, alongside the existing `disconnectButton`/`disconnectText` styles:

```ts
  actions: { flexDirection: 'row', gap: 8 },
  forgetButton: {
    backgroundColor: '#1F2A37',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  forgetText: { color: '#8A94A6', fontWeight: '600', fontSize: 12 },
```

- [ ] **Step 3: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: PASS, all suites, same count as after Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: add Forget adapter action to DashboardScreen"
```

---

## Self-Review Notes

- **Spec coverage:** Storage module → Task 1. Store persistence + `forgetDevice` → Task 2. ScanScreen auto-reconnect/cancel/error-fallback → Task 3. DashboardScreen forget action → Task 4. All spec sections covered.
- **Placeholder scan:** no TBD/TODO; every step has literal code or a concrete manual-verification checklist (used only where the Global Constraints explicitly rule out automated screen tests).
- **Type consistency:** `LastDevice` (Task 1) is `Pick<DiscoveredDevice, 'id' | 'name' | 'transport'>` and is used with that exact shape in Task 2's `saveLastDevice` call and Task 3's `getLastDevice()` consumption (constructing a full `DiscoveredDevice` from it by pass-through, since `LastDevice`'s fields are a subset). `forgetDevice()` signature (`() => Promise<void>`) is identical everywhere it's referenced (Task 2 defines it, Task 4 calls it).
