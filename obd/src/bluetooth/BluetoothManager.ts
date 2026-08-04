import { Platform } from 'react-native';
import type { DiscoveredDevice } from '../types';
import type { BluetoothTransport } from './BluetoothTransport';
import { BleTransport } from './BleTransport';
import { ClassicTransport } from './ClassicTransport';

/**
 * Auto-detects and scans both Classic SPP and BLE transports (Classic is
 * Android-only), merging results. The caller picks a `DiscoveredDevice`
 * and calls `connect`, which routes to the matching transport instance.
 */
export class BluetoothManager {
  private classic = Platform.OS === 'android' ? new ClassicTransport() : null;
  private ble = new BleTransport();
  private active: BluetoothTransport | null = null;

  async scanAll(timeoutMs = 12000): Promise<DiscoveredDevice[]> {
    const scans: Promise<DiscoveredDevice[]>[] = [this.ble.scan(timeoutMs)];
    if (this.classic) scans.push(this.classic.scan(timeoutMs));

    const results = await Promise.allSettled(scans);
    const devices: DiscoveredDevice[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') devices.push(...r.value);
    }
    return devices;
  }

  stopScan(): void {
    this.ble.stopScan();
    this.classic?.stopScan();
  }

  async connect(device: DiscoveredDevice): Promise<BluetoothTransport> {
    const transport = device.transport === 'ble' ? this.ble : this.classic;
    if (!transport) {
      throw new Error('Classic Bluetooth is not supported on this platform');
    }
    await transport.connect(device.id);
    this.active = transport;
    return transport;
  }

  async disconnect(): Promise<void> {
    await this.active?.disconnect();
    this.active = null;
  }

  getActiveTransport(): BluetoothTransport | null {
    return this.active;
  }

  destroy(): void {
    this.ble.destroy();
  }
}
