import type { PidDefinition } from '../types';

/**
 * SAE J1979 Mode 01 (current data) PID table.
 * Formulas per the public SAE J1979 / ISO 15031-5 standard PID reference
 * (see docs/VEHICLE_DATA.md for the source list). Only the subset needed
 * for a general-purpose live dashboard is implemented.
 */
export const MODE01_PIDS: Record<string, PidDefinition> = {
  '04': {
    pid: '04',
    name: 'ENGINE_LOAD',
    description: 'Calculated engine load',
    minBytes: 1,
    unit: '%',
    decode: ([a]) => round1((a / 255) * 100),
    min: 0,
    max: 100,
  },
  '05': {
    pid: '05',
    name: 'COOLANT_TEMP',
    description: 'Engine coolant temperature',
    minBytes: 1,
    unit: '°C',
    decode: ([a]) => a - 40,
    min: -40,
    max: 215,
  },
  '0A': {
    pid: '0A',
    name: 'FUEL_PRESSURE',
    description: 'Fuel pressure',
    minBytes: 1,
    unit: 'kPa',
    decode: ([a]) => a * 3,
    min: 0,
    max: 765,
  },
  '0C': {
    pid: '0C',
    name: 'RPM',
    description: 'Engine RPM',
    minBytes: 2,
    unit: 'rpm',
    decode: ([a, b]) => round1(((a * 256 + b) / 4)),
    min: 0,
    max: 16383.75,
  },
  '0D': {
    pid: '0D',
    name: 'SPEED',
    description: 'Vehicle speed',
    minBytes: 1,
    unit: 'km/h',
    decode: ([a]) => a,
    min: 0,
    max: 255,
  },
  '0F': {
    pid: '0F',
    name: 'INTAKE_AIR_TEMP',
    description: 'Intake air temperature',
    minBytes: 1,
    unit: '°C',
    decode: ([a]) => a - 40,
    min: -40,
    max: 215,
  },
  '10': {
    pid: '10',
    name: 'MAF',
    description: 'Mass air flow rate',
    minBytes: 2,
    unit: 'g/s',
    decode: ([a, b]) => round1((a * 256 + b) / 100),
    min: 0,
    max: 655.35,
  },
  '11': {
    pid: '11',
    name: 'THROTTLE_POSITION',
    description: 'Throttle position',
    minBytes: 1,
    unit: '%',
    decode: ([a]) => round1((a / 255) * 100),
    min: 0,
    max: 100,
  },
  '2F': {
    pid: '2F',
    name: 'FUEL_LEVEL',
    description: 'Fuel tank level input',
    minBytes: 1,
    unit: '%',
    decode: ([a]) => round1((a / 255) * 100),
    min: 0,
    max: 100,
  },
  '33': {
    pid: '33',
    name: 'BAROMETRIC_PRESSURE',
    description: 'Barometric pressure',
    minBytes: 1,
    unit: 'kPa',
    decode: ([a]) => a,
    min: 0,
    max: 255,
  },
  '42': {
    pid: '42',
    name: 'CONTROL_MODULE_VOLTAGE',
    description: 'Control module voltage',
    minBytes: 2,
    unit: 'V',
    decode: ([a, b]) => round1((a * 256 + b) / 1000),
    min: 0,
    max: 65.535,
  },
  '46': {
    pid: '46',
    name: 'AMBIENT_AIR_TEMP',
    description: 'Ambient air temperature',
    minBytes: 1,
    unit: '°C',
    decode: ([a]) => a - 40,
    min: -40,
    max: 215,
  },
  '5C': {
    pid: '5C',
    name: 'ENGINE_OIL_TEMP',
    description: 'Engine oil temperature',
    minBytes: 1,
    unit: '°C',
    decode: ([a]) => a - 40,
    min: -40,
    max: 215,
  },
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const LIVE_DASHBOARD_PIDS = ['0C', '0D', '05', '2F', '04', '11', '0F', '42'];

export function getPidDefinition(pid: string): PidDefinition | undefined {
  return MODE01_PIDS[pid.toUpperCase()];
}
