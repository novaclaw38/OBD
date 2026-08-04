import { PermissionsAndroid, Platform } from 'react-native';
import type { DiscoveredDevice } from '../types';
import { TransportError, type BluetoothTransport } from './BluetoothTransport';

// react-native-bluetooth-classic ships its own JS API; typed loosely here
// since its .d.ts is incomplete for some events.
const RNBluetoothClassic = require('react-native-bluetooth-classic').default;

/**
 * Classic Bluetooth (SPP) transport for the majority of cheap ELM327
 * dongles, which expose an RFCOMM serial port profile. Android-only —
 * iOS does not permit Classic Bluetooth SPP for third-party apps.
 */
export class ClassicTransport implements BluetoothTransport {
  readonly kind = 'classic' as const;
  private connectedDevice: any = null;
  private dataSubscription: any = null;
  private disconnectSubscription: any = null;

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const apiLevel = Platform.Version as number;
    const perms =
      apiLevel >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const results = await PermissionsAndroid.requestMultiple(perms);
    return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }

  async scan(timeoutMs = 12000): Promise<DiscoveredDevice[]> {
    const granted = await this.requestPermissions();
    if (!granted) throw new TransportError('Bluetooth permissions denied');

    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) throw new TransportError('Bluetooth is disabled');

    const bonded: any[] = await RNBluetoothClassic.getBondedDevices();
    const bondedResults: DiscoveredDevice[] = bonded.map((d) => ({
      id: d.address,
      name: d.name ?? null,
      transport: 'classic',
      bonded: true,
    }));

    let discovered: DiscoveredDevice[] = [];
    try {
      const found: any[] = await Promise.race([
        RNBluetoothClassic.startDiscovery(),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), timeoutMs)),
      ]);
      discovered = found.map((d) => ({
        id: d.address,
        name: d.name ?? null,
        transport: 'classic',
        bonded: false,
      }));
    } catch {
      // Discovery can fail on some OEM Android builds; bonded devices still work.
    }

    const byId = new Map<string, DiscoveredDevice>();
    [...bondedResults, ...discovered].forEach((d) => byId.set(d.id, d));
    return Array.from(byId.values());
  }

  stopScan(): void {
    RNBluetoothClassic.cancelDiscovery().catch(() => {});
  }

  async connect(deviceId: string): Promise<void> {
    try {
      const device = await RNBluetoothClassic.connectToDevice(deviceId, {
        connectorType: 'rfcomm',
        DELIMITER: '\r',
      });
      this.connectedDevice = device;
    } catch (e) {
      throw new TransportError(`Failed to connect to ${deviceId}`, e);
    }
  }

  async disconnect(): Promise<void> {
    this.dataSubscription?.remove?.();
    this.disconnectSubscription?.remove?.();
    if (this.connectedDevice) {
      await this.connectedDevice.disconnect().catch(() => {});
      this.connectedDevice = null;
    }
  }

  isConnected(): boolean {
    return this.connectedDevice != null;
  }

  async write(command: string): Promise<void> {
    if (!this.connectedDevice) throw new TransportError('Not connected');
    await this.connectedDevice.write(`${command}\r`);
  }

  onData(listener: (chunk: string) => void): () => void {
    if (!this.connectedDevice) return () => {};
    this.dataSubscription = this.connectedDevice.onDataReceived((event: { data: string }) =>
      listener(event.data),
    );
    return () => this.dataSubscription?.remove?.();
  }

  onDisconnect(listener: () => void): () => void {
    if (!this.connectedDevice) return () => {};
    this.disconnectSubscription = this.connectedDevice.onDisconnected(() => listener());
    return () => this.disconnectSubscription?.remove?.();
  }
}
