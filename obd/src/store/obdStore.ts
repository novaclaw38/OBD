import { create } from 'zustand';
import type {
  ConnectionStatus,
  DiagnosticTroubleCode,
  DiscoveredDevice,
  LiveDataSample,
  VehicleInfo,
} from '../types';
import { BluetoothManager } from '../bluetooth/BluetoothManager';
import { ObdService } from '../obd/ObdService';
import { decodeVin } from '../vehicleData/vpic';
import { saveLastDevice, clearLastDevice } from '../storage/lastDevice';

interface ObdStoreState {
  connection: ConnectionStatus;
  devices: DiscoveredDevice[];
  scanning: boolean;
  liveData: Record<string, LiveDataSample>;
  dtcs: DiagnosticTroubleCode[];
  vehicleInfo: VehicleInfo | null;
  lastError: string | null;

  manager: BluetoothManager;
  service: ObdService;

  scan: () => Promise<void>;
  connect: (device: DiscoveredDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  forgetDevice: () => Promise<void>;
  refreshLiveData: () => Promise<void>;
  refreshDtcs: () => Promise<void>;
  clearDtcs: () => Promise<void>;
  loadVehicleInfo: () => Promise<void>;
}

const manager = new BluetoothManager();
const service = new ObdService();
let refreshInFlight = false;
let connectGeneration = 0;

export const useObdStore = create<ObdStoreState>((set, get) => ({
  connection: { state: 'disconnected', device: null, error: null, protocol: null },
  devices: [],
  scanning: false,
  liveData: {},
  dtcs: [],
  vehicleInfo: null,
  lastError: null,
  manager,
  service,

  scan: async () => {
    set({ scanning: true, lastError: null });
    try {
      const devices = await manager.scanAll();
      set({ devices, scanning: false });
    } catch (e) {
      set({ scanning: false, lastError: describeError(e) });
    }
  },

  connect: async (device: DiscoveredDevice) => {
    const myGeneration = ++connectGeneration;
    set((s) => ({ connection: { ...s.connection, state: 'connecting', device, error: null } }));
    try {
      const transport = await manager.connect(device);
      if (myGeneration !== connectGeneration) return;
      await service.attach(transport);
      service.onDisconnect((err) => {
        if (myGeneration !== connectGeneration) return;
        set({
          connection: { state: 'error', device: null, error: err.message, protocol: null },
        });
      });

      set((s) => ({ connection: { ...s.connection, state: 'initializing' } }));
      const { protocol } = await service.initialize();
      if (myGeneration !== connectGeneration) return;
      set({ connection: { state: 'connected', device, error: null, protocol } });
      saveLastDevice({ id: device.id, name: device.name, transport: device.transport }).catch(() => {});
    } catch (e) {
      if (myGeneration !== connectGeneration) return;
      set({
        connection: { state: 'error', device: null, error: describeError(e), protocol: null },
      });
    }
  },

  disconnect: async () => {
    connectGeneration++;
    service.detach();
    await manager.disconnect();
    set({
      connection: { state: 'disconnected', device: null, error: null, protocol: null },
      liveData: {},
      dtcs: [],
    });
  },

  forgetDevice: async () => {
    await clearLastDevice();
  },

  refreshLiveData: async () => {
    if (refreshInFlight) return;
    refreshInFlight = true;
    try {
      const { samples } = await service.readLiveDataBatch();
      set((s) => {
        const next = { ...s.liveData };
        samples.forEach((sample) => {
          next[sample.pid] = sample;
        });
        return { liveData: next };
      });
    } finally {
      refreshInFlight = false;
    }
  },

  refreshDtcs: async () => {
    try {
      const [stored, pending] = await Promise.all([
        service.readStoredDtcs(),
        service.readPendingDtcs(),
      ]);
      set({ dtcs: [...stored, ...pending] });
    } catch (e) {
      set({ lastError: describeError(e) });
    }
  },

  clearDtcs: async () => {
    await service.clearDtcs();
    set({ dtcs: [] });
    await get().refreshDtcs();
  },

  loadVehicleInfo: async () => {
    const vin = await service.readVin();
    if (!vin) {
      set({ vehicleInfo: { vin: null, make: null, model: null, modelYear: null, manufacturer: null, fuelType: null, source: 'unavailable' } });
      return;
    }
    const info = await decodeVin(vin);
    set({ vehicleInfo: info });
  },
}));

function describeError(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as any).message);
  return String(e);
}
