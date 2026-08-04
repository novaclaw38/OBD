jest.mock('../../obd/ObdService');

import { useObdStore } from '../obdStore';

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
