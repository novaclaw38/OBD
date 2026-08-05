# Units Toggle (Metric/Imperial) — Design

Status: approved
Date: 2026-08-05
Sub-project 3a of 3 sibling data-feature sub-projects (units toggle, freeze-frame,
live-data history), themselves part of sub-project 3 of the full critique-driven
roadmap (see `docs/superpowers/specs/2026-08-05-core-correctness-fixes-design.md`).
Sub-projects 1 (core correctness fixes) and 2 (auto-reconnect) are merged.

## Context

The dashboard always shows speed in km/h and temperatures in °C, regardless of
the user's locale. This adds a metric/imperial toggle, persisted across
launches, affecting the two PIDs where the two systems actually disagree:
`0D` (SPEED, km/h vs mph) and `05`/`0F` (COOLANT_TEMP/INTAKE_AIR_TEMP, °C vs
°F). Percent, RPM, g/s, and V readings are unaffected by unit system and stay
as-is (confirmed with the user — pressure-unit conversion, e.g. kPa→psi, was
explicitly scoped out).

## Design principle: convert at render time only

`ObdService` and `src/obd/pids.ts` keep decoding exactly as today — raw SI
values (km/h, °C) flow through `LiveDataSample.value` unchanged. Conversion
is a pure display-layer concern, applied only when a screen renders a value.
This keeps the hardware-facing layer (already covered by
`ObdService.integration.test.ts`, `pids.test.ts`) completely untouched, and
means any future consumer of live data (freeze-frame in sub-project 3b,
history in sub-project 3c) gets unit-awareness for free by reusing the same
helper — no decode-layer changes ever needed for this.

## New files

### `src/utils/units.ts`

Pure functions, no I/O:

```ts
export type UnitSystem = 'metric' | 'imperial';

export function formatSpeed(kmh: number, system: UnitSystem): { value: number; unit: string };
export function formatTemp(celsius: number, system: UnitSystem): { value: number; unit: string };
export function formatSampleValue(
  sample: LiveDataSample,
  system: UnitSystem,
): { value: number | string; unit: string };
```

- `formatSpeed`: metric passes through (`{ value: kmh, unit: 'km/h' }`); imperial
  converts `mph = Math.round(kmh * 0.621371)`.
- `formatTemp`: metric passes through (`{ value: celsius, unit: '°C' }`); imperial
  converts `fahrenheit = Math.round(celsius * 9/5 + 32)`.
- `formatSampleValue` is the one function screens call: dispatches to
  `formatSpeed` for `sample.pid === '0D'`, to `formatTemp` for
  `sample.pid === '05' || sample.pid === '0F'`, and for every other PID
  returns `{ value: sample.value, unit: sample.unit }` unchanged (pass-through,
  works for both string and number sample values).

### `src/storage/unitPreference.ts`

Mirrors `src/storage/lastDevice.ts`'s AsyncStorage pattern exactly (same
single-key JSON approach, same defensive parse-failure-returns-default
behavior):

```ts
export async function getUnitSystem(): Promise<UnitSystem>; // defaults to 'metric'
export async function saveUnitSystem(system: UnitSystem): Promise<void>;
```

Storage key: `obd:unit-system`. Unlike `lastDevice`'s `getLastDevice()`
(which returns `null` when unset), `getUnitSystem()` returns `'metric'` as
the default — there's no meaningful "unset" state for a binary preference,
and every caller needs a concrete `UnitSystem` value to render with.

### `src/store/settingsStore.ts`

A new, separate Zustand store — deliberately not folded into `obdStore`,
since unit preference is a cross-cutting display concern unrelated to
Bluetooth/connection state, and `obdStore` already has a clear single
responsibility (connection + live OBD data) that this doesn't belong in.

```ts
interface SettingsStoreState {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => Promise<void>;
  loadUnitSystem: () => Promise<void>;
}
```

- Initial state: `unitSystem: 'metric'` (matches storage's default, so the
  UI never flashes an unconverted value before hydration completes).
- `setUnitSystem`: `set({ unitSystem: system })` then `await saveUnitSystem(system)`.
- `loadUnitSystem`: `const system = await getUnitSystem(); set({ unitSystem: system })`.
  Called once, at app startup (see `App.tsx` below) — not on every screen mount.

### `src/screens/SettingsScreen.tsx`

Minimal screen: title, a two-option segmented control (Metric / Imperial)
reflecting and calling `useSettingsStore`. Same dark-palette styling
conventions as every other screen in the app. This is deliberately the seed
of sub-project 4's full settings screen (which will add custom-PID
management to the same screen), not a throwaway — sub-project 4 extends this
file rather than replacing it.

## Modified files

- **`App.tsx`**: add a `useEffect(() => { useSettingsStore.getState().loadUnitSystem(); }, [])`
  at the top level, alongside the existing provider/navigator setup. This is
  the first app-root-level (rather than screen-level) async load in the
  codebase — appropriate here since unit preference isn't owned by any one
  screen's lifecycle, unlike `lastDevice` which is legitimately
  `ScanScreen`'s concern.
- **`src/screens/DashboardScreen.tsx`**: reads `unitSystem` via
  `useSettingsStore`; the PID card rendering (`sample ? String(sample.value) : '—'`
  plus the separate unit `Text`) is replaced with a call to
  `formatSampleValue(sample, unitSystem)` before rendering, for every PID in
  `LIVE_DASHBOARD_PIDS` (the function's pass-through behavior means this is a
  single code-path change, not a per-PID branch in the screen). Gains one
  more entry in the existing nav-button row: "Settings", navigating to the
  new screen.
- **`src/navigation/RootNavigator.tsx`**: registers `SettingsScreen` in the
  stack (same pattern as `Dtc`/`VehicleInfo` — `headerShown: true`).

## Testing

- `src/utils/__tests__/units.test.ts`: `formatSpeed`/`formatTemp` correctness
  in both directions (metric pass-through, imperial conversion, rounding),
  and `formatSampleValue` dispatch correctness (speed PID, both temp PIDs,
  and at least one pass-through PID like `0C`/RPM asserting the value/unit
  are returned unchanged).
- `src/storage/__tests__/unitPreference.test.ts`: round-trip save/get,
  default-to-metric when unset, default-to-metric on malformed stored JSON
  (matching `lastDevice.test.ts`'s malformed-JSON test shape).
- No new screen-level tests (`DashboardScreen.tsx`, `SettingsScreen.tsx`) —
  consistent with the "screens aren't tested yet in this codebase" scope
  decision already made in sub-project 2.

## Non-goals

- No conversion for pressure (kPa/psi), MAF (g/s), percent, RPM, or voltage
  readings — explicitly scoped out.
- No per-PID unit override — one global metric/imperial toggle for the whole
  app.
- No change to `ObdService`, `pids.ts` decode functions, or any Mode
  01/03/04/07/09 logic.
- `SettingsScreen` in this sub-project contains only the units toggle — custom
  PID management is sub-project 4's addition to this same file, not built here.
