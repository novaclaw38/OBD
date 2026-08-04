# OBD2 Scanner

A React Native (TypeScript) Bluetooth OBD2 diagnostic scanner. Connects to
ELM327-compatible adapters over Classic Bluetooth (SPP) or BLE, reads live
engine data (Mode 01), reads and clears diagnostic trouble codes (Mode
03/04/07), and decodes basic vehicle info from the VIN (Mode 09) via the
NHTSA vPIC public API.

## Architecture

```
src/
  bluetooth/     Transport layer — BluetoothTransport interface with two
                  implementations (ClassicTransport, BleTransport) unified
                  by BluetoothManager, which scans both and auto-detects
                  which one a selected device needs.
  obd/           Protocol layer — ELM327 command engine (ObdService), raw
                  response parsing (response.ts), the SAE J1979 Mode 01 PID
                  table (pids.ts), and DTC byte decoding (dtc.ts). Has no
                  dependency on React Native or any transport implementation
                  beyond the BluetoothTransport interface, so it is unit
                  testable without hardware.
  vehicleData/   VIN decoding via NHTSA vPIC (vpic.ts, with AsyncStorage
                  caching) and the bundled generic DTC description table
                  (dtcDescriptions.ts).
  store/         Zustand store (obdStore.ts) wiring the transport + protocol
                  layers to UI state (connection status, live data, DTCs,
                  vehicle info).
  screens/       Scan, Dashboard (live data), DTC (read/clear), Vehicle Info.
  navigation/    React Navigation native-stack setup.
```

The transport and protocol layers are deliberately decoupled: `ObdService`
only calls `write()`/`onData()`/`isConnected()` on a `BluetoothTransport`, so
it works identically against `ClassicTransport`, `BleTransport`, or (in
tests) a fully in-memory fake — see
`src/obd/__tests__/ObdService.integration.test.ts`.

## Bluetooth transports

- **Classic SPP** (`ClassicTransport`, Android only — iOS does not allow
  third-party apps to use Classic Bluetooth SPP): covers the majority of
  cheap ELM327 clone dongles, via `react-native-bluetooth-classic`.
- **BLE** (`BleTransport`, Android + iOS): covers BLE-capable adapters
  (Vgate iCar Pro BLE, VLinker, OBDLink, generic HM-10/Nordic-UART clones)
  via `react-native-ble-plx`. The transport probes a device's GATT services
  against a table of known UART-style service/characteristic UUIDs
  (`KNOWN_PROFILES` in `BleTransport.ts`) and binds to whichever matches.

`BluetoothManager.scanAll()` scans both transports in parallel and merges
results; `connect(device)` routes to the correct transport based on the
device's `transport` field.

## OBD2 protocol coverage

- **Mode 01** (current data): RPM, speed, coolant temp, fuel level, engine
  load, throttle position, intake air temp, control module voltage — see
  `LIVE_DASHBOARD_PIDS` in `src/obd/pids.ts`. Additional PIDs can be added to
  `MODE01_PIDS` following the existing `PidDefinition` shape.
- **Mode 03 / 07**: stored / pending diagnostic trouble codes.
- **Mode 04**: clear trouble codes (with a confirmation prompt in the UI,
  since it also resets the MIL and freeze-frame data on the vehicle).
- **Mode 09 PID 02**: VIN read, used to look up make/model/year.

## Vehicle data source

See [`docs/VEHICLE_DATA.md`](docs/VEHICLE_DATA.md) for the full detail. In
short:

- **VIN decoding** uses the free, keyless [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/)
  (`DecodeVinValues`), with results cached in `AsyncStorage` so a previously
  seen VIN resolves offline.
- **PID formulas** are the standardized SAE J1979 / ISO 15031-5 definitions,
  bundled directly in `src/obd/pids.ts` (no external data file needed — the
  formulas are fixed by the standard).
- **DTC descriptions** are the standardized SAE J2012 / ISO 15031-6 generic
  code set, bundled in `src/vehicleData/dtcDescriptions.ts`. Manufacturer-
  specific codes (most P1xxx/P3xxx codes) are reported by number but not
  described, since their meaning isn't standardized.

## Setup

```sh
npm install

# iOS only
cd ios && bundle install && bundle exec pod install && cd ..
```

Requires Node ≥ 22.11, and for native builds: Xcode (iOS) and Android
Studio / an Android SDK (Android). See the [React Native environment
setup guide](https://reactnative.dev/docs/set-up-your-environment) if you
haven't built a bare RN app before.

## Running

```sh
npm start          # Metro bundler

npm run android     # build + run on a connected device/emulator
npm run ios         # build + run on a connected device/simulator
```

BLE adapters work in the iOS Simulator's UI but cannot actually connect to
Bluetooth hardware — test BLE and Classic SPP on a physical device.

## Testing

```sh
npm test
```

40 tests across 5 suites:

- `src/obd/__tests__/pids.test.ts` — PID decode formulas against known
  byte/value pairs from the SAE spec.
- `src/obd/__tests__/dtc.test.ts` — DTC byte-pair → code-string decoding for
  all four prefix families (P/C/B/U) and padding handling.
- `src/obd/__tests__/response.test.ts` — raw ELM327 text parsing: prompt/
  noise stripping, error classification (`NO DATA`, `UNABLE TO CONNECT`,
  `?`), hex line parsing, and PID-echo/CAN-header stripping.
- `src/obd/__tests__/ObdService.integration.test.ts` — end-to-end command
  flow against a fake in-memory ELM327 transport: init sequence, PID reads,
  DTC read/clear, VIN read, command queue serialization, timeout handling,
  and disconnect-mid-command handling.
- `__tests__/App.test.tsx` — app-level smoke render.

## Error handling

`ObdService` surfaces a typed `ObdError` (`src/types/index.ts`) with a
`code` of `CONNECTION_LOST | TIMEOUT | MALFORMED_RESPONSE | UNSUPPORTED_PID
| ADAPTER_ERROR | NO_DATA | UNKNOWN`, so the UI/store can react appropriately
instead of pattern-matching adapter text:

- Commands are queued and single-in-flight (the adapter is a serial device);
  a disconnect mid-command rejects all queued/in-flight commands immediately
  rather than leaving them hanging.
- Every command has a timeout (4s default, 6s during init) in case the
  adapter never sends a terminating `>` prompt.
- `readLiveDataBatch` isolates per-PID failures — one unsupported/failing PID
  doesn't take down the rest of the dashboard.
- Malformed/short responses (wrong byte count, no matching PID echo, stray
  CAN headers) are detected in `extractPidData` rather than silently
  producing garbage values.

## Known limitations

- **Manufacturer-specific DTCs** (most P1xxx/P3xxx, and all-manufacturer
  U1xxx/U3xxx) are not described — only the SAE-generic set is bundled.
- **BLE profile detection** relies on a fixed table of known UUID sets
  (`KNOWN_PROFILES` in `BleTransport.ts`). Adapters using an unlisted custom
  GATT profile will fail to connect over BLE; add their UUIDs to the table.
- **Classic SPP is Android-only** — there is no iOS fallback for
  non-BLE-capable dongles, by Apple platform restriction, not app design.
  This is why the app should be paired with a broad recommendation for BLE
  adapters if iOS support matters.
- **No mode 02 freeze-frame or Mode 06 on-board monitoring** support yet;
  only Modes 01/03/04/07/09 are implemented.
- **Multi-frame (ISO-TP) CAN responses** longer than what the ELM327
  reassembles internally in default line-mode aren't specially handled
  beyond concatenating each returned line's data bytes — sufficient for all
  currently-implemented PIDs (≤ 4 data bytes) but would need extending for
  longer multi-line responses (e.g. Mode 09 PIDs beyond VIN).
- **vPIC lookups require connectivity** the first time a given VIN is seen;
  after that the result is cached locally and works offline.
