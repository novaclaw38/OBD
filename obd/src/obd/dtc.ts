import type { DiagnosticTroubleCode } from '../types';
import { describeDtc } from '../vehicleData/dtcDescriptions';

const DTC_PREFIX = ['P', 'C', 'B', 'U'] as const;

/**
 * Decode two raw bytes into a single DTC string per SAE J2012 / ISO 15031-6.
 * The top two bits of the first byte select the letter prefix, the next two
 * bits are the first digit, and the remaining 12 bits are hex digits 2-4.
 */
/* eslint-disable no-bitwise -- bit-field extraction is inherent to the SAE J2012 byte layout */
export function decodeDtcBytes(a: number, b: number): string | null {
  if (a === 0 && b === 0) return null; // padding / no code

  const prefixIndex = (a & 0xc0) >> 6;
  const firstDigit = (a & 0x30) >> 4;
  const secondDigit = a & 0x0f;
  const thirdDigit = (b & 0xf0) >> 4;
  const fourthDigit = b & 0x0f;

  const prefix = DTC_PREFIX[prefixIndex];
  return `${prefix}${firstDigit}${secondDigit.toString(16)}${thirdDigit.toString(
    16,
  )}${fourthDigit.toString(16)}`.toUpperCase();
}
/* eslint-enable no-bitwise */

/**
 * Parse a Mode 03 (stored) or Mode 07 (pending) response payload.
 * `bytes` excludes the mode/PID echo header, e.g. for "43 02 01 33 00 00"
 * pass [0x02, 0x01, 0x33, 0x00, 0x00] (first byte = code count, then pairs).
 */
export function parseDtcResponse(
  bytes: number[],
  status: 'stored' | 'pending',
): DiagnosticTroubleCode[] {
  const codes: DiagnosticTroubleCode[] = [];
  // First byte after mode/PID echo is the number of codes in some adapters;
  // more commonly the payload is just a stream of byte pairs. Handle both by
  // scanning pairwise and skipping zero-pairs.
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const code = decodeDtcBytes(a, b);
    if (code) {
      codes.push({
        code,
        description: describeDtc(code),
        status,
        raw: `${a.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
      });
    }
  }
  return codes;
}
