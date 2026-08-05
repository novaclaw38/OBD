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
