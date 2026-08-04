import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';
import type { DiscoveredDevice } from '../types';
import { TransportError, type BluetoothTransport } from './BluetoothTransport';

/**
 * Known UART-style service/characteristic UUID sets used by common ELM327
 * BLE adapters (Vgate iCar Pro BLE, VLinker, generic HM-10/HC clones,
 * Nordic-UART-based dongles). We probe each candidate's services on
 * connect and bind to whichever matches.
 */
interface UartProfile {
  service: string;
  write: string;
  notify: string;
}

const KNOWN_PROFILES: UartProfile[] = [
  // Nordic UART Service (many modern OBD BLE adapters)
  {
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    write: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notify: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  },
  // Common ELM327 BLE clones (Vgate, generic FFF0)
  {
    service: '0000fff0-0000-1000-8000-00805f9b34fb',
    write: '0000fff2-0000-1000-8000-00805f9b34fb',
    notify: '0000fff1-0000-1000-8000-00805f9b34fb',
  },
  // HM-10 style single-characteristic serial bridge
  {
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    write: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notify: '0000ffe1-0000-1000-8000-00805f9b34fb',
  },
];

export class BleTransport implements BluetoothTransport {
  readonly kind = 'ble' as const;
  private manager = new BleManager();
  private device: Device | null = null;
  private profile: UartProfile | null = null;
  private notifySubscription: Subscription | null = null;
  private dataListeners = new Set<(chunk: string) => void>();
  private disconnectListeners = new Set<() => void>();

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const apiLevel = Platform.Version as number;
    const perms =
      apiLevel >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const results = await PermissionsAndroid.requestMultiple(perms);
    return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }

  async scan(timeoutMs = 12000): Promise<DiscoveredDevice[]> {
    const granted = await this.requestPermissions();
    if (!granted) throw new TransportError('Bluetooth permissions denied');

    const found = new Map<string, DiscoveredDevice>();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(Array.from(found.values()));
      }, timeoutMs);

      this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          clearTimeout(timer);
          this.manager.stopDeviceScan();
          reject(new TransportError('BLE scan failed', error));
          return;
        }
        if (device) {
          found.set(device.id, {
            id: device.id,
            name: device.name ?? device.localName ?? null,
            transport: 'ble',
            rssi: device.rssi ?? undefined,
          });
        }
      });
    });
  }

  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  async connect(deviceId: string): Promise<void> {
    try {
      const device = await this.manager.connectToDevice(deviceId, { timeout: 10000 });
      await device.discoverAllServicesAndCharacteristics();
      const services = await device.services();

      let matched: UartProfile | null = null;
      for (const candidate of KNOWN_PROFILES) {
        const hasService = services.some(
          (s) => s.uuid.toLowerCase() === candidate.service.toLowerCase(),
        );
        if (hasService) {
          matched = candidate;
          break;
        }
      }
      if (!matched) {
        throw new TransportError(
          'Connected device does not expose a recognized OBD BLE serial profile',
        );
      }

      this.device = device;
      this.profile = matched;

      this.notifySubscription = device.monitorCharacteristicForService(
        matched.service,
        matched.notify,
        (error, characteristic) => {
          if (error) return;
          const base64 = characteristic?.value;
          if (!base64) return;
          const text = Buffer.from(base64, 'base64').toString('utf8');
          this.dataListeners.forEach((l) => l(text));
        },
      );

      device.onDisconnected(() => {
        this.disconnectListeners.forEach((l) => l());
      });
    } catch (e) {
      if (e instanceof TransportError) throw e;
      throw new TransportError(`Failed to connect to ${deviceId}`, e);
    }
  }

  async disconnect(): Promise<void> {
    this.notifySubscription?.remove();
    this.notifySubscription = null;
    if (this.device) {
      await this.manager.cancelDeviceConnection(this.device.id).catch(() => {});
      this.device = null;
    }
    this.profile = null;
  }

  isConnected(): boolean {
    return this.device != null;
  }

  async write(command: string): Promise<void> {
    if (!this.device || !this.profile) throw new TransportError('Not connected');
    const payload = Buffer.from(`${command}\r`, 'utf8').toString('base64');
    await this.device.writeCharacteristicWithResponseForService(
      this.profile.service,
      this.profile.write,
      payload,
    );
  }

  onData(listener: (chunk: string) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  destroy(): void {
    this.manager.destroy();
  }
}
