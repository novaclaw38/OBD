export type TransportKind = 'classic' | 'ble';

export interface DiscoveredDevice {
  id: string;
  name: string | null;
  transport: TransportKind;
  rssi?: number;
  bonded?: boolean;
}

export type ConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'initializing'
  | 'connected'
  | 'error';

export interface ConnectionStatus {
  state: ConnectionState;
  device: DiscoveredDevice | null;
  error: string | null;
  protocol: string | null;
}

/** SAE J1979 Mode 01 PID definition + decoder. */
export interface PidDefinition {
  pid: string; // hex, e.g. '0C'
  name: string;
  description: string;
  minBytes: number;
  unit: string;
  decode: (bytes: number[]) => number | string;
  min?: number;
  max?: number;
}

export interface LiveDataSample {
  pid: string;
  name: string;
  value: number | string;
  unit: string;
  timestamp: number;
}

export interface DiagnosticTroubleCode {
  code: string; // e.g. 'P0301'
  description: string;
  status: 'stored' | 'pending';
  raw: string;
}

export interface VehicleInfo {
  vin: string | null;
  make: string | null;
  model: string | null;
  modelYear: string | null;
  manufacturer: string | null;
  fuelType: string | null;
  source: 'vpic-online' | 'vpic-cache' | 'unavailable';
}

export interface ObdError {
  code:
    | 'CONNECTION_LOST'
    | 'TIMEOUT'
    | 'MALFORMED_RESPONSE'
    | 'UNSUPPORTED_PID'
    | 'ADAPTER_ERROR'
    | 'NO_DATA'
    | 'UNKNOWN';
  message: string;
  raw?: string;
}
