# OBD Scanner (Android)

A fully-functional OBD-II diagnostic scanner for Android that talks to
**ELM327-compatible dongles over both Bluetooth (Classic/SPP) and Wi-Fi (TCP)**.

Built with Kotlin, Jetpack Compose (Material 3) and coroutines, using a clean
transport → protocol → repository → UI architecture.

<p align="center"><em>Dark-first instrument-cluster UI · live sensor dashboard · trouble-code read/clear · VIN &amp; vehicle info</em></p>

---

## Features

| Area | What it does |
|------|--------------|
| **Dual connectivity** | Bluetooth Classic (RFCOMM/SPP) **and** Wi-Fi (TCP socket) to any ELM327 clone. |
| **Auto adapter setup** | Runs the full ELM327 handshake (`ATZ`, `ATE0`, `ATL0`, `ATS0`, `ATH0`, `ATSP0`) and auto-detects the vehicle's OBD protocol. |
| **Supported-PID discovery** | Queries the `0100/0120/0140/0160` support bitmasks so it only polls sensors your car actually reports — no wasted `NO DATA` round-trips. |
| **Live dashboard** | Animated arc gauges for RPM, speed, coolant and load, plus compact tiles for throttle, MAF, intake temp, fuel trims, timing, fuel level, voltage and more. Polls continuously at ~5 Hz. |
| **Trouble codes** | Reads **stored (mode 03)** and **pending (mode 07)** DTCs, decodes them to canonical codes (P/C/B/U), and shows plain-English descriptions for common generic codes with an intelligent subsystem fallback for the rest. |
| **Clear codes** | Sends mode 04 to clear codes / turn off the check-engine light, behind an explicit confirmation dialog that warns about monitor resets. |
| **Vehicle info** | Reads the VIN (mode 09 PID 02), reports the negotiated protocol and live battery/module voltage (`ATRV`). |
| **Resilient link** | Per-command timeouts, single-threaded serialized adapter access, graceful "connection lost" handling, and an RFCOMM reflection fallback for cheap dongles that advertise no SDP record. |

## Architecture

```
transport/            Raw byte links (medium-agnostic)
  ObdTransport            interface: connect / write / readByte / close
  BluetoothObdTransport   RFCOMM SPP socket (+ reflection fallback)
  WifiObdTransport        TCP socket (default 192.168.0.10:35000)

protocol/             ELM327 + OBD-II wire protocol
  Elm327                  handshake + command/response ('>' prompt) loop
  ObdResponse             cleaning, error detection, byte extraction
  Pids                    SAE J1979 PID definitions + decode formulas
  Dtc / DtcDecoder        mode 03/07 parsing + code descriptions

data/                 State + orchestration
  ObdRepository           single source of truth: connection lifecycle,
                          live polling loop, DTC/VIN operations (StateFlow)
  SettingsStore           DataStore-backed connection preferences
  Models                  ConnectionState, Reading, VehicleInfo, ...

ui/                   Jetpack Compose (MVVM)
  ObdViewModel            AndroidViewModel bridging repo <-> screens
  screens/                Connect · Dashboard · Dtc · VehicleInfo
  components/             ArcGauge, MetricCard
  theme/                  dark instrument-cluster Material 3 theme
```

All adapter I/O is confined to a single background thread and further serialized
with a mutex, so the live-polling loop never interleaves a half-written command
with a DTC scan on the same wire.

## Building & running

> Requires **Android Studio (Koala / 2024.1+)** and an **Android SDK** with API 34.
> This repo contains no SDK and cannot build in a headless CI without one.

1. Open the `obd-scanner-android/` folder in Android Studio (it is a standalone
   Gradle project, independent of the surrounding web app).
2. Let Gradle sync (it will fetch the Android Gradle Plugin, Compose, etc.).
3. Run on a **physical device** — Bluetooth Classic and the dongle's Wi-Fi AP are
   not available on the emulator.

From the command line (with a local SDK configured via `local.properties` or
`ANDROID_HOME`):

```bash
cd obd-scanner-android
./gradlew assembleDebug      # build the APK -> app/build/outputs/apk/debug/
./gradlew test               # run the JVM unit tests (protocol decoders)
./gradlew installDebug       # install onto a connected device
```

Minimum SDK 24 (Android 7.0), target SDK 34.

## Using it with a dongle

**Bluetooth**
1. Pair the dongle in Android *Settings → Bluetooth* first (typical name `OBDII`
   / `Vgate` / `V-LINK`; PIN is usually `1234` or `0000`).
2. Open the app, keep the **Bluetooth** tab, grant the nearby-devices permission,
   tap your adapter.

**Wi-Fi**
1. In Android *Settings → Wi-Fi*, join the dongle's network (e.g. `WiFi_OBDII`).
   You may need to keep mobile data off so the phone routes to the dongle.
2. Open the app, switch to the **Wi-Fi** tab, confirm host/port (defaults
   `192.168.0.10:35000` suit most units), tap **Connect**.

Then turn the ignition to ON (engine running gives the richest data).

## Permissions

| Permission | Why | When |
|-----------|-----|------|
| `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN` | Connect to the paired dongle | Android 12+ (requested at runtime) |
| `BLUETOOTH`, `BLUETOOTH_ADMIN` | Same, legacy | Android ≤ 11 (install-time) |
| `INTERNET`, `ACCESS_WIFI_STATE` | TCP socket to Wi-Fi dongles | all versions |

`BLUETOOTH_SCAN` is declared with `neverForLocation` — the app does not derive
physical location from Bluetooth.

## Safety note

Clearing trouble codes also resets emissions-readiness monitors and freeze-frame
data, and does not fix the underlying fault — the code returns if the problem
persists. The app requires an explicit confirmation before sending mode 04. Do
not operate the UI while driving.

## Compatibility

Works with the ELM327 command set (v1.3–v2.x clones). Genuine ELM327 and better
clones (STN-based OBDLink) are the most reliable. Very cheap v1.5 clones with
incomplete AT support may need the RFCOMM fallback (handled automatically).
