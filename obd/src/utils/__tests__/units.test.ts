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
