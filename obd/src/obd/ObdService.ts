import type { BluetoothTransport } from '../bluetooth/BluetoothTransport';
import type { DiagnosticTroubleCode, LiveDataSample, ObdError } from '../types';
import { getPidDefinition, LIVE_DASHBOARD_PIDS } from './pids';
import { parseDtcResponse } from './dtc';
import { cleanElmResponse, classifyElmError, extractPidData, parseHexLine } from './response';

const DEFAULT_TIMEOUT_MS = 4000;
const INIT_TIMEOUT_MS = 6000;

interface QueuedCommand {
  command: string;
  timeoutMs: number;
  resolve: (raw: string) => void;
  reject: (err: ObdError) => void;
}

interface InFlightCommand {
  resolve: (raw: string) => void;
  reject: (err: ObdError) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Drives an ELM327-compatible adapter over any BluetoothTransport.
 * Owns a single-in-flight command queue (the adapter is a serial device —
 * commands must complete, signalled by the ">" prompt, before the next is
 * sent) plus the AT initialization sequence and Mode 01/03/04/09 helpers.
 */
export class ObdService {
  private transport: BluetoothTransport | null = null;
  private buffer = '';
  private pending: InFlightCommand | null = null;
  private queue: QueuedCommand[] = [];
  private unsubData: (() => void) | null = null;
  private unsubDisconnect: (() => void) | null = null;
  private disconnectListeners = new Set<(err: ObdError) => void>();

  async attach(transport: BluetoothTransport): Promise<void> {
    this.transport = transport;
    this.unsubData = transport.onData((chunk) => this.handleChunk(chunk));
    this.unsubDisconnect = transport.onDisconnect(() => {
      this.failPending({ code: 'CONNECTION_LOST', message: 'Bluetooth connection lost' });
      this.disconnectListeners.forEach((l) =>
        l({ code: 'CONNECTION_LOST', message: 'Bluetooth connection lost' }),
      );
    });
  }

  detach(): void {
    this.unsubData?.();
    this.unsubDisconnect?.();
    this.transport = null;
  }

  onDisconnect(listener: (err: ObdError) => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  /** Standard ELM327 reset + config sequence, tolerant of clone quirks. */
  async initialize(): Promise<{ protocol: string }> {
    await this.sendCommand('ATZ', INIT_TIMEOUT_MS).catch(() => {}); // reset; some clones don't echo OK
    await this.sendCommand('ATE0'); // echo off
    await this.sendCommand('ATL0'); // linefeeds off
    await this.sendCommand('ATS0'); // spaces off (some clones ignore; parser tolerates spaces either way)
    await this.sendCommand('ATH0'); // headers off by default
    await this.sendCommand('ATSP0'); // auto-detect protocol
    // Trigger protocol detection with a benign query.
    const raw = await this.sendCommand('0100', INIT_TIMEOUT_MS);
    const err = classifyElmError(cleanElmResponse(raw));
    if (err && err.code !== 'NO_DATA') throw err;
    const protoRaw = await this.sendCommand('ATDPN').catch(() => 'unknown');
    return { protocol: cleanElmResponse(protoRaw)[0] ?? 'unknown' };
  }

  async readPid(pid: string): Promise<LiveDataSample> {
    const def = getPidDefinition(pid);
    if (!def) {
      const err: ObdError = { code: 'UNSUPPORTED_PID', message: `Unknown PID ${pid}` };
      throw err;
    }
    const raw = await this.sendCommand(`01${pid}`);
    const bytes = extractPidData(raw, 1, pid);
    if (bytes.length < def.minBytes) {
      const err: ObdError = {
        code: 'MALFORMED_RESPONSE',
        message: `Expected ${def.minBytes} bytes for PID ${pid}, got ${bytes.length}`,
        raw,
      };
      throw err;
    }
    const value = def.decode(bytes);
    return { pid: def.pid, name: def.name, value, unit: def.unit, timestamp: Date.now() };
  }

  /** Reads the standard live dashboard PID set, tolerating per-PID failures. */
  async readLiveDataBatch(
    pids: string[] = LIVE_DASHBOARD_PIDS,
  ): Promise<{ samples: LiveDataSample[]; errors: Array<{ pid: string; error: ObdError }> }> {
    const samples: LiveDataSample[] = [];
    const errors: Array<{ pid: string; error: ObdError }> = [];
    for (const pid of pids) {
      try {
        samples.push(await this.readPid(pid));
      } catch (e) {
        errors.push({ pid, error: e as ObdError });
      }
    }
    return { samples, errors };
  }

  async readStoredDtcs(): Promise<DiagnosticTroubleCode[]> {
    const raw = await this.sendCommand('03');
    const bytes = extractPidDataForMode(raw, 3);
    return parseDtcResponse(bytes, 'stored');
  }

  async readPendingDtcs(): Promise<DiagnosticTroubleCode[]> {
    const raw = await this.sendCommand('07');
    const bytes = extractPidDataForMode(raw, 7);
    return parseDtcResponse(bytes, 'pending');
  }

  async clearDtcs(): Promise<void> {
    const raw = await this.sendCommand('04', DEFAULT_TIMEOUT_MS);
    const err = classifyElmError(cleanElmResponse(raw));
    if (err) throw err;
  }

  async readVin(): Promise<string | null> {
    try {
      const raw = await this.sendCommand('0902');
      const bytes = extractPidDataForMode(raw, 9, '02');
      // Response includes a leading "number of data items" byte before the
      // ASCII VIN payload on most adapters; strip non-printable leading bytes.
      const printable = bytes.filter((b) => b >= 0x20 && b <= 0x7e);
      const vin = printable.map((b) => String.fromCharCode(b)).join('');
      return vin.length >= 11 ? vin : null;
    } catch {
      return null;
    }
  }

  private sendCommand(command: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
    if (!this.transport?.isConnected()) {
      return Promise.reject<string>({
        code: 'CONNECTION_LOST',
        message: 'No active connection',
      } satisfies ObdError);
    }
    return new Promise<string>((resolve, reject) => {
      this.queue.push({ command, timeoutMs, resolve, reject });
      if (!this.pending) this.drainNext();
    });
  }

  private drainNext(): void {
    const next = this.queue.shift();
    if (!next) return;
    this.buffer = '';
    this.pending = {
      resolve: next.resolve,
      reject: next.reject,
      timer: setTimeout(() => {
        this.pending = null;
        next.reject({ code: 'TIMEOUT', message: `Command "${next.command}" timed out` });
        this.drainNext();
      }, next.timeoutMs),
    };
    this.transport!.write(next.command).catch((e) => {
      if (!this.pending) return;
      clearTimeout(this.pending.timer);
      this.pending = null;
      next.reject({
        code: 'CONNECTION_LOST',
        message: 'Failed to write command',
        raw: String(e),
      });
      this.drainNext();
    });
  }

  private handleChunk(chunk: string): void {
    this.buffer += chunk;
    if (!this.buffer.includes('>')) return;
    const complete = this.buffer;
    this.buffer = '';
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { resolve } = this.pending;
    this.pending = null;
    resolve(complete);
    this.drainNext();
  }

  private failPending(err: ObdError): void {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(err);
      this.pending = null;
    }
    this.queue.forEach((q) => q.reject(err));
    this.queue = [];
  }
}

function extractPidDataForMode(raw: string, mode: number, pid = ''): number[] {
  return extractPidData(raw, mode, pid);
}

export { parseHexLine };
