import type { DiscoveredDevice, TransportKind } from '../types';

/**
 * Transport-agnostic interface implemented by both the Classic SPP and BLE
 * backends. The OBD2 protocol layer only depends on this interface, so it
 * never needs to know which radio is in use.
 */
export interface BluetoothTransport {
  readonly kind: TransportKind;
  scan(timeoutMs?: number): Promise<DiscoveredDevice[]>;
  stopScan(): void;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  /** Send raw text (an AT command or OBD request) terminated with \r. */
  write(command: string): Promise<void>;
  /** Subscribe to incoming raw text chunks. Returns an unsubscribe fn. */
  onData(listener: (chunk: string) => void): () => void;
  onDisconnect(listener: () => void): () => void;
}

export class TransportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TransportError';
  }
}
