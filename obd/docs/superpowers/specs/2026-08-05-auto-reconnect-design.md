# Auto-Reconnect / Remembered Adapter — Design

Status: approved
Date: 2026-08-05
Sub-project 2 of 6 (see `docs/superpowers/specs/2026-08-05-core-correctness-fixes-design.md`
for the full roadmap; sub-project 1, core correctness fixes, is merged).

## Context

Today every app launch requires a full Bluetooth scan and a manual device
tap before the OBD2 scanner is usable, even when the same adapter was used
last time. This spec adds: remembering the last successfully-connected
adapter, auto-reconnecting to it on app launch, and a way to forget it.

## Goal

On cold start, if a device was previously connected successfully, the app
attempts to reconnect to that exact device directly (no scan) before
falling back to the normal scan-and-pick flow.

## Storage

New file `src/storage/lastDevice.ts`, following the same AsyncStorage
caching pattern already used in `src/vehicleData/vpic.ts` (single key,
JSON-serialized value, `try/catch` around parse failures).

```ts
export interface LastDevice {
  id: string;
  name: string | null;
  transport: TransportKind; // 'classic' | 'ble', from src/types
}

export async function getLastDevice(): Promise<LastDevice | null>;
export async function saveLastDevice(device: LastDevice): Promise<void>;
export async function clearLastDevice(): Promise<void>;
```

Storage key: `obd:last-device`. `getLastDevice` returns `null` on any
missing/malformed stored value (parse errors are swallowed, matching
`vpic.ts`'s defensive style) rather than throwing.

## Store changes (`src/store/obdStore.ts`)

- `connect()`: on reaching `connection.state === 'connected'`, call
  `saveLastDevice({ id: device.id, name: device.name, transport: device.transport })`.
  Fire-and-forget (don't block the state transition on the write); a
  failure to persist is not a connection failure.
- New action `forgetDevice(): Promise<void>` — calls `clearLastDevice()`
  only. Does not touch `manager`, `service`, or `connection` state. A
  currently-connected session is unaffected.
- No new "reconnect" store action. `ScanScreen` reconnects by calling the
  existing `connect(device)` with a `DiscoveredDevice` constructed from the
  stored `LastDevice` (same shape, `rssi`/`bonded` omitted since they're
  optional and irrelevant to connecting).

## ScanScreen changes

Current behavior: `useEffect` on mount unconditionally calls `scan()`.

New behavior:
- On mount, call `getLastDevice()`.
  - If it returns a device: set local state `reconnectTarget` to it, and
    call `connect(reconnectTarget)` directly — **do not** call `scan()`.
    Do not wait for the user to interact.
  - If it returns `null`: unchanged — call `scan()` immediately.
- While `reconnectTarget` is set and `connection.state` is `'connecting'`
  or `'initializing'`, render "Reconnecting to `<name ?? 'adapter'>`…"
  (replacing/above the normal scanning subtitle) with a **Cancel** button.
- **Cancel** calls `disconnect()`, clears `reconnectTarget` to `null`, then
  calls `scan()` to fall through to the normal flow.
- If `connection.state` becomes `'error'` while `reconnectTarget` is set:
  clear `reconnectTarget` to `null` and call `scan()`. The existing error
  text (`connection.error`) stays visible per the existing render logic —
  no new error UI needed, it already renders whenever
  `connection.state === 'error' && connection.error`.
- If `connection.state` becomes `'connected'`, the existing
  `navigation.replace('Dashboard')` effect already fires unchanged.
- Manual device taps from the list (`handleConnect`) are unaffected by any
  of this — they don't touch `reconnectTarget`.

## DashboardScreen changes

Add a small secondary text action near the existing Disconnect button:
"Forget adapter", calling `forgetDevice()`. No confirmation dialog. Purely
additive — no change to existing Disconnect behavior or styling beyond
adding one more element to the header row.

## Testing

- `src/storage/__tests__/lastDevice.test.ts`: round-trip
  save → get → clear, and `getLastDevice()` returns `null` both when
  nothing is stored and when the stored value is malformed JSON.
- Extend `src/store/__tests__/obdStore.test.ts`: a successful `connect()`
  results in `AsyncStorage` holding the connected device (verify via
  `getLastDevice()`, not by reaching into `AsyncStorage` mock internals);
  `forgetDevice()` clears it without changing `connection` state.
- No new screen-level tests. The codebase currently has zero tests for any
  screen component; adding one ad hoc here would be inconsistent with the
  rest of the codebase and is explicitly sub-project 6's scope (broader
  store/screen/transport test coverage), not this one's.

## Non-goals

- No retry/backoff loop if the reconnect attempt fails — one attempt, then
  fall back to manual scan, matching existing single-attempt `connect()`
  semantics elsewhere in the app.
- No "adapter out of range" special-casing beyond the existing
  `connection.state === 'error'` path already used for any connect failure.
- Only one remembered device at a time (last successful connection wins,
  whether that connection came from auto-reconnect or a manual tap).
- No change to `BluetoothManager` or `ObdService` — both already support
  connecting directly by device id without a prior scan.
