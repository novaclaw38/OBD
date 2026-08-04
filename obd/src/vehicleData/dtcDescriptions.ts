/**
 * Bundled subset of SAE J2012 / ISO 15031-6 generic (P0xxx/C0xxx/B0xxx/U0xxx)
 * DTC descriptions. Generic codes are standardized across all OBD2 vehicles;
 * manufacturer-specific codes (P1xxx etc.) are not decoded offline.
 *
 * Source & regeneration: see docs/VEHICLE_DATA.md. Hand-curated from the
 * SAE J2012 generic code list; can be regenerated from a CSV via
 * scripts/generate-dtc-table.js.
 */
export const DTC_DESCRIPTIONS: Record<string, string> = {
  P0100: 'Mass or Volume Air Flow Circuit Malfunction',
  P0101: 'Mass or Volume Air Flow Circuit Range/Performance Problem',
  P0102: 'Mass or Volume Air Flow Circuit Low Input',
  P0103: 'Mass or Volume Air Flow Circuit High Input',
  P0110: 'Intake Air Temperature Circuit Malfunction',
  P0115: 'Engine Coolant Temperature Circuit Malfunction',
  P0116: 'Engine Coolant Temperature Circuit Range/Performance Problem',
  P0117: 'Engine Coolant Temperature Circuit Low Input',
  P0118: 'Engine Coolant Temperature Circuit High Input',
  P0120: 'Throttle/Pedal Position Sensor/Switch A Circuit Malfunction',
  P0125: 'Insufficient Coolant Temperature for Closed Loop Fuel Control',
  P0128: 'Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)',
  P0130: 'O2 Sensor Circuit Malfunction (Bank 1 Sensor 1)',
  P0133: 'O2 Sensor Circuit Slow Response (Bank 1 Sensor 1)',
  P0135: 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)',
  P0141: 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 2)',
  P0170: 'Fuel Trim Malfunction (Bank 1)',
  P0171: 'System Too Lean (Bank 1)',
  P0172: 'System Too Rich (Bank 1)',
  P0174: 'System Too Lean (Bank 2)',
  P0175: 'System Too Rich (Bank 2)',
  P0200: 'Injector Circuit Malfunction',
  P0217: 'Engine Overtemperature Condition',
  P0230: 'Fuel Pump Primary Circuit Malfunction',
  P0300: 'Random/Multiple Cylinder Misfire Detected',
  P0301: 'Cylinder 1 Misfire Detected',
  P0302: 'Cylinder 2 Misfire Detected',
  P0303: 'Cylinder 3 Misfire Detected',
  P0304: 'Cylinder 4 Misfire Detected',
  P0305: 'Cylinder 5 Misfire Detected',
  P0306: 'Cylinder 6 Misfire Detected',
  P0325: 'Knock Sensor 1 Circuit Malfunction (Bank 1)',
  P0335: 'Crankshaft Position Sensor A Circuit Malfunction',
  P0340: 'Camshaft Position Sensor Circuit Malfunction',
  P0400: 'Exhaust Gas Recirculation Flow Malfunction',
  P0401: 'Exhaust Gas Recirculation Flow Insufficient Detected',
  P0420: 'Catalyst System Efficiency Below Threshold (Bank 1)',
  P0430: 'Catalyst System Efficiency Below Threshold (Bank 2)',
  P0440: 'Evaporative Emission Control System Malfunction',
  P0442: 'Evaporative Emission Control System Leak Detected (small leak)',
  P0446: 'Evaporative Emission Control System Vent Control Circuit Malfunction',
  P0455: 'Evaporative Emission Control System Leak Detected (large leak)',
  P0500: 'Vehicle Speed Sensor Malfunction',
  P0505: 'Idle Control System Malfunction',
  P0506: 'Idle Control System RPM Lower Than Expected',
  P0507: 'Idle Control System RPM Higher Than Expected',
  P0600: 'Serial Communication Link Malfunction',
  P0601: 'Internal Control Module Memory Check Sum Error',
  P0700: 'Transmission Control System Malfunction',
  P0705: 'Transmission Range Sensor Circuit Malfunction (PRNDL Input)',
  P0715: 'Input/Turbine Speed Sensor Circuit Malfunction',
  P0720: 'Output Speed Sensor Circuit Malfunction',
  C0035: 'Left Front Wheel Speed Circuit Malfunction',
  C0040: 'Right Front Wheel Speed Circuit Malfunction',
  B0001: 'Driver Frontal Stage 1 Deployment Control',
  U0100: 'Lost Communication With ECM/PCM',
  U0101: 'Lost Communication With TCM',
};

export function describeDtc(code: string): string {
  return DTC_DESCRIPTIONS[code] ?? 'Unknown / manufacturer-specific code';
}
