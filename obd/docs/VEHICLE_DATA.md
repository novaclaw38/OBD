# Vehicle data source & update process

This app uses two categories of "vehicle data" that are conceptually
different and are sourced/updated differently.

## 1. VIN → make/model/year (NHTSA vPIC)

**Source**: [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) — the National
Highway Traffic Safety Administration's public Vehicle Product Information
Catalog. It's free, keyless, covers vehicles sold in the US market (which in
practice covers the large majority of makes/models seen globally), and is
kept current by NHTSA directly — there is nothing in this app to "update"
for this part.

**Integration** (`src/vehicleData/vpic.ts`):

1. `ObdService.readVin()` sends Mode 09 PID 02 to the adapter and decodes
   the ASCII VIN from the response bytes.
2. `decodeVin(vin)` calls
   `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json`.
3. The result is cached in `AsyncStorage` under `vpic-cache:{vin}` so the
   same vehicle resolves instantly and offline on subsequent connections.
4. On network failure or an unparseable VIN, `VehicleInfo.source` is set to
   `'unavailable'` and the UI shows the raw VIN (if read) with make/model
   blank, rather than failing the whole screen.

No local snapshot of vPIC data is bundled — VIN decoding requires
connectivity the first time a given VIN is seen. If fully offline VIN
decoding becomes a requirement, vPIC also publishes a bulk
[WMI (World Manufacturer Identifier) CSV export](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer)
that could be pre-fetched and bundled as a static JSON lookup table for the
3-character WMI prefix (enough to resolve make + country + vehicle type,
though not model/year, without a network call).

## 2. PID formulas (SAE J1979 / ISO 15031-5)

**Source**: the SAE J1979 / ISO 15031-5 standard itself, which fixes both
the PID numbers and their byte-to-value formulas (e.g. RPM = `(A*256+B)/4`).
These are not "data" that changes over time or needs a live source — they're
bundled directly as code in `src/obd/pids.ts` (`MODE01_PIDS`), each entry
carrying the PID number, human name, unit, byte-count, and decode function.

**To add a PID**: add an entry to `MODE01_PIDS` following the
`PidDefinition` shape and, if it should appear on the live dashboard, add its
key to `LIVE_DASHBOARD_PIDS`.

## 3. DTC descriptions (SAE J2012 / ISO 15031-6)

**Source**: the SAE J2012 / ISO 15031-6 generic (manufacturer-independent)
DTC code list — the standardized subset of P0xxx/C0xxx/B0xxx/U0xxx codes
whose meaning is fixed across all OBD2-compliant vehicles. Bundled in
`src/vehicleData/dtcDescriptions.ts` as a static `Record<string, string>`
(`DTC_DESCRIPTIONS`).

This is a curated subset covering the most commonly seen generic codes, not
the full several-hundred-entry standard list. **Manufacturer-specific codes**
(most P1xxx/P3xxx codes, and manufacturer U1xxx/U3xxx codes) are
intentionally not decoded — their meaning varies by OEM and isn't part of
the generic standard, so the app reports the code number with a
"manufacturer-specific" fallback rather than guessing.

**To extend the table**: run `node scripts/generate-dtc-table.js path/to/codes.csv`
against a two-column `code,description` CSV (see the script's header
comment for the exact format) to regenerate
`src/vehicleData/dtcDescriptions.ts` in full. For a handful of one-off
additions, hand-editing the `DTC_DESCRIPTIONS` object directly is also fine.
