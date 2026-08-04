import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VehicleInfo } from '../types';

/**
 * NHTSA vPIC (Vehicle Product Information Catalog) — a free, keyless public
 * API for decoding VINs into make/model/year/manufacturer. See
 * docs/VEHICLE_DATA.md for details and the update/caching strategy.
 */
const VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const CACHE_PREFIX = 'vpic-cache:';
const FETCH_TIMEOUT_MS = 8000;

interface VpicResult {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  Manufacturer?: string;
  FuelTypePrimary?: string;
  ErrorCode?: string;
}

export async function decodeVin(vin: string): Promise<VehicleInfo> {
  const cacheKey = `${CACHE_PREFIX}${vin}`;

  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as VehicleInfo;
    return { ...parsed, source: 'vpic-cache' };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(`${VPIC_BASE}/${vin}?format=json`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) throw new Error(`vPIC HTTP ${response.status}`);
    const json = await response.json();
    const result: VpicResult | undefined = json?.Results?.[0];
    if (!result) throw new Error('vPIC returned no results');

    const info: VehicleInfo = {
      vin,
      make: result.Make || null,
      model: result.Model || null,
      modelYear: result.ModelYear || null,
      manufacturer: result.Manufacturer || null,
      fuelType: result.FuelTypePrimary || null,
      source: 'vpic-online',
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(info)).catch(() => {});
    return info;
  } catch {
    return {
      vin,
      make: null,
      model: null,
      modelYear: null,
      manufacturer: null,
      fuelType: null,
      source: 'unavailable',
    };
  }
}
