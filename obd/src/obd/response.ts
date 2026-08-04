import type { ObdError } from '../types';

/**
 * Parsing helpers for raw ELM327 text responses. The adapter echoes the
 * command (unless ATE0 is set), terminates replies with a '>' prompt, and
 * emits informational strings ("SEARCHING...", "NO DATA", "STOPPED",
 * "UNABLE TO CONNECT", "?") that are not hex data.
 */

const NOISE_LINES = new Set([
  'SEARCHING...',
  'BUS INIT: OK',
  'BUS INIT: ...OK',
]);

export function cleanElmResponse(raw: string): string[] {
  return raw
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== '>' && !NOISE_LINES.has(l));
}

export function classifyElmError(lines: string[]): ObdError | null {
  const joined = lines.join(' ').toUpperCase();
  if (joined.includes('NO DATA')) {
    return { code: 'NO_DATA', message: 'No data returned for this PID/command', raw: joined };
  }
  if (joined.includes('UNABLE TO CONNECT')) {
    return {
      code: 'ADAPTER_ERROR',
      message: 'Adapter could not connect to the vehicle ECU',
      raw: joined,
    };
  }
  if (joined.includes('CAN ERROR') || joined.includes('BUS ERROR')) {
    return { code: 'ADAPTER_ERROR', message: 'Vehicle bus error', raw: joined };
  }
  if (joined === '?' || joined.includes('ERROR')) {
    return { code: 'MALFORMED_RESPONSE', message: 'Adapter did not understand the command', raw: joined };
  }
  if (joined.includes('STOPPED')) {
    return { code: 'TIMEOUT', message: 'Command interrupted', raw: joined };
  }
  return null;
}

/**
 * Extract hex byte pairs from a single OBD data line, e.g.
 * "41 0C 1A F8" -> [0x41, 0x0C, 0x1A, 0xF8]. Tolerates a leading CAN header
 * (e.g. "7E8 04 41 0C 1A F8") by taking the last N tokens that are valid hex.
 */
export function parseHexLine(line: string): number[] | null {
  const tokens = line.replace(/^0x/i, '').split(/\s+/).filter(Boolean);
  const hexTokens = tokens.filter((t) => /^[0-9A-Fa-f]{1,2}$/.test(t));
  if (hexTokens.length === 0) return null;
  return hexTokens.map((t) => parseInt(t, 16));
}

/**
 * Given raw response text for a Mode 01 PID request (e.g. "0C"), strip the
 * "41 0C" echo header (mode+0x40, PID) and return the remaining data bytes.
 * Combines multi-line CAN responses (ISO-TP framing already reassembled by
 * ELM327 in default line mode) by concatenating byte streams.
 */
export function extractPidData(raw: string, mode: number, pid: string): number[] {
  const lines = cleanElmResponse(raw);
  const err = classifyElmError(lines);
  if (err) throw err;

  const expectedModeByte = (mode + 0x40).toString(16).padStart(2, '0').toUpperCase();
  const pidUpper = pid.toUpperCase();

  const bytes: number[] = [];
  for (const line of lines) {
    const parsed = parseHexLine(line);
    if (!parsed) continue;
    const hexBytes = parsed.map((b) => b.toString(16).padStart(2, '0').toUpperCase());
    const modeIdx = hexBytes.indexOf(expectedModeByte);
    if (modeIdx === -1) continue;
    // Modes 01/02/09 echo the requested PID immediately after the mode byte;
    // modes 03/04/07 (DTC read/clear) take no PID and only echo the mode.
    if (pid && (mode === 1 || mode === 2 || mode === 9)) {
      if (hexBytes[modeIdx + 1] !== pidUpper) continue;
      bytes.push(...parsed.slice(modeIdx + 2));
    } else {
      bytes.push(...parsed.slice(modeIdx + 1));
    }
  }

  if (bytes.length === 0) {
    const error: ObdError = {
      code: 'MALFORMED_RESPONSE',
      message: `No parsable data for mode ${mode} PID ${pid}`,
      raw,
    };
    throw error;
  }
  return bytes;
}
