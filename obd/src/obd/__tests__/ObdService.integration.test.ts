import { ObdService } from '../ObdService';
import type { BluetoothTransport } from '../../bluetooth/BluetoothTransport';
import type { TransportKind } from '../../types';

/**
 * A fake ELM327 that replies to well-known AT/OBD commands, used to
 * integration-test the write -> buffer -> ">"-terminated response cycle
 * without any real Bluetooth hardware.
 */
class FakeElm327Transport implements BluetoothTransport {
  readonly kind: TransportKind = 'classic';
  private connected = true;
  private dataListeners = new Set<(chunk: string) => void>();
  private disconnectListeners = new Set<() => void>();
  public sentCommands: string[] = [];
  public scriptedFailures = new Set<string>();

  async scan() {
    return [];
  }
  stopScan() {}
  async connect() {
    this.connected = true;
  }
  async disconnect() {
    this.connected = false;
  }
  isConnected() {
    return this.connected;
  }

  async write(command: string): Promise<void> {
    const cmd = command.trim();
    this.sentCommands.push(cmd);
    if (this.scriptedFailures.has(cmd)) return; // simulate a dropped/no-op command -> timeout
    const reply = this.replyFor(cmd);
    // Simulate async radio delivery.
    setTimeout(() => {
      this.dataListeners.forEach((l) => l(`${reply}\r>`));
    }, 0);
  }

  onData(listener: (chunk: string) => void) {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onDisconnect(listener: () => void) {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  simulateDisconnect() {
    this.connected = false;
    this.disconnectListeners.forEach((l) => l());
  }

  private replyFor(cmd: string): string {
    switch (cmd) {
      case 'ATZ':
        return 'ELM327 v1.5';
      case 'ATE0':
      case 'ATL0':
      case 'ATS0':
      case 'ATH0':
      case 'ATSP0':
        return 'OK';
      case '0100':
        return '41 00 BE 3E B8 11';
      case 'ATDPN':
        return '6';
      case '010C':
        return '41 0C 1A F8'; // RPM = 1726
      case '010D':
        return '41 0D 5A'; // Speed = 90
      case '0105':
        return '41 05 5A'; // Coolant temp = 90 - 40 = 50
      case '03':
        return '43 01 33 00 00';
      case '07':
        return '47 00 00';
      case '04':
        return '44';
      case '0902':
        return '49 02 01 57 30 4C 30 30 30 30 30 30 30 30 30 30 30 31';
      default:
        return 'NO DATA';
    }
  }
}

describe('ObdService integration', () => {
  it('runs the ELM327 init sequence and reports the detected protocol', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const { protocol } = await service.initialize();

    expect(protocol).toBe('6');
    expect(transport.sentCommands).toEqual([
      'ATZ',
      'ATE0',
      'ATL0',
      'ATS0',
      'ATH0',
      'ATSP0',
      '0100',
      'ATDPN',
    ]);
  });

  it('reads and decodes a live PID', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const sample = await service.readPid('0C');
    expect(sample).toMatchObject({ pid: '0C', name: 'RPM', value: 1726, unit: 'rpm' });
  });

  it('batches multiple PIDs and isolates per-PID failures', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const { samples, errors } = await service.readLiveDataBatch(['0C', 'FF', '0D']);
    expect(samples.map((s) => s.pid)).toEqual(['0C', '0D']);
    expect(errors).toHaveLength(1);
    expect(errors[0].pid).toBe('FF');
  });

  it('reads stored DTCs and decodes them', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const dtcs = await service.readStoredDtcs();
    expect(dtcs).toHaveLength(1);
    expect(dtcs[0]).toMatchObject({ code: 'P0133', status: 'stored' });
  });

  it('clears DTCs by sending Mode 04', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    await expect(service.clearDtcs()).resolves.toBeUndefined();
    expect(transport.sentCommands).toContain('04');
  });

  it('reads and decodes the VIN via Mode 09 PID 02', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const vin = await service.readVin();
    expect(vin).toBe('W0L000000000001');
  });

  it('rejects in-flight commands when the transport disconnects', async () => {
    const transport = new FakeElm327Transport();
    transport.scriptedFailures.add('010C'); // never replies
    const service = new ObdService();
    await service.attach(transport);

    const pending = service.readPid('0C');
    transport.simulateDisconnect();

    await expect(pending).rejects.toMatchObject({ code: 'CONNECTION_LOST' });
  });

  it('rejects still-queued (not yet in-flight) commands when the transport disconnects', async () => {
    const transport = new FakeElm327Transport();
    transport.scriptedFailures.add('010C'); // never replies, so it stays in flight
    const service = new ObdService();
    await service.attach(transport);

    // First command is issued but never resolves, so it occupies the single
    // in-flight slot. The second is issued without awaiting the first, so it
    // sits behind it in `queue` rather than ever being written.
    const inFlight = service.readPid('0C');
    const stillQueued = service.readPid('0D');

    transport.simulateDisconnect();

    await expect(inFlight).rejects.toMatchObject({ code: 'CONNECTION_LOST' });
    await expect(stillQueued).rejects.toMatchObject({ code: 'CONNECTION_LOST' });
    // Only the in-flight command was ever written; the queued one never got there.
    expect(transport.sentCommands).toEqual(['010C']);
  });

  it('times out a command that never receives a response', async () => {
    jest.useFakeTimers();
    const transport = new FakeElm327Transport();
    transport.scriptedFailures.add('010C');
    const service = new ObdService();
    await service.attach(transport);

    const pending = service.readPid('0C');
    // eslint-disable-next-line jest/valid-expect
    const assertion = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
    jest.advanceTimersByTime(5000);
    await assertion;
    jest.useRealTimers();
  });

  it('serializes commands sent back-to-back through the single-in-flight queue', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const [rpm, speed] = await Promise.all([service.readPid('0C'), service.readPid('0D')]);
    expect(rpm.value).toBe(1726);
    expect(speed.value).toBe(90);
    // Commands must have been written one at a time, not interleaved.
    expect(transport.sentCommands).toEqual(['010C', '010D']);
  });

  it('resolves each of three back-to-back commands with its own matching reply', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const [rpm, speed, coolant] = await Promise.all([
      service.readPid('0C'),
      service.readPid('0D'),
      service.readPid('05'),
    ]);

    expect(rpm).toMatchObject({ pid: '0C', value: 1726 });
    expect(speed).toMatchObject({ pid: '0D', value: 90 });
    expect(coolant).toMatchObject({ pid: '05', value: 50 });
    expect(transport.sentCommands).toEqual(['010C', '010D', '0105']);
  });
});
