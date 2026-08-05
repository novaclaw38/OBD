jest.mock('../../obd/ObdService');
jest.mock('../../bluetooth/BluetoothManager');

import { useObdStore } from '../obdStore';
import { getLastDevice } from '../../storage/lastDevice';
import type { DiscoveredDevice } from '../../types';

describe('obdStore refreshLiveData backpressure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops a second call while the first is still in flight', async () => {
    const { service } = useObdStore.getState();
    let resolveBatch!: (value: { samples: never[]; errors: never[] }) => void;
    const pending = new Promise<{ samples: never[]; errors: never[] }>((resolve) => {
      resolveBatch = resolve;
    });
    (service.readLiveDataBatch as jest.Mock).mockReturnValue(pending);

    const first = useObdStore.getState().refreshLiveData();
    const second = useObdStore.getState().refreshLiveData();

    expect(service.readLiveDataBatch).toHaveBeenCalledTimes(1);

    resolveBatch({ samples: [], errors: [] });
    await Promise.all([first, second]);

    expect(service.readLiveDataBatch).toHaveBeenCalledTimes(1);
  });

  it('allows a new call to run once the previous one finished', async () => {
    const { service } = useObdStore.getState();
    (service.readLiveDataBatch as jest.Mock).mockResolvedValue({ samples: [], errors: [] });

    await useObdStore.getState().refreshLiveData();
    await useObdStore.getState().refreshLiveData();

    expect(service.readLiveDataBatch).toHaveBeenCalledTimes(2);
  });
});

describe('obdStore remembered-device persistence', () => {
  const device: DiscoveredDevice = { id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const { manager, service } = useObdStore.getState();
    (manager.connect as jest.Mock).mockResolvedValue({});
    (service.initialize as jest.Mock).mockResolvedValue({ protocol: '6' });
    await useObdStore.getState().forgetDevice();
  });

  it('remembers the device after a successful connect', async () => {
    await useObdStore.getState().connect(device);

    expect(await getLastDevice()).toEqual({ id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' });
  });

  it('forgetDevice clears the remembered device without changing connection state', async () => {
    await useObdStore.getState().connect(device);
    const connectionBefore = useObdStore.getState().connection;

    await useObdStore.getState().forgetDevice();

    expect(await getLastDevice()).toBeNull();
    expect(useObdStore.getState().connection).toEqual(connectionBefore);
  });
});

describe('obdStore connect/disconnect race', () => {
  const device: DiscoveredDevice = { id: 'AA:BB:CC', name: 'OBDII', transport: 'classic' };

  beforeEach(async () => {
    jest.clearAllMocks();
    await useObdStore.getState().forgetDevice();
  });

  it('a stale connect() that rejects after disconnect() does not clobber connection state', async () => {
    const { manager } = useObdStore.getState();
    let rejectConnect!: (err: Error) => void;
    const pending = new Promise((_resolve, reject) => {
      rejectConnect = reject;
    });
    (manager.connect as jest.Mock).mockReturnValue(pending);

    const connectPromise = useObdStore.getState().connect(device);

    await useObdStore.getState().disconnect();
    expect(useObdStore.getState().connection.state).toBe('disconnected');

    rejectConnect(new Error('adapter went away'));
    await connectPromise;

    expect(useObdStore.getState().connection.state).toBe('disconnected');
  });
});
