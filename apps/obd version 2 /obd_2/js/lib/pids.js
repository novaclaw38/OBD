// Standard OBD-II Mode 01 PID definitions and response decoders.
// Each decoder takes the data bytes (A, B, C, D as numbers) after mode+pid and returns { value, unit }.
export const PIDS = {
  '0104': { name: 'Engine Load', unit: '%', bytes: 1, decode: (A) => (A * 100) / 255 },
  '0105': { name: 'Coolant Temp', unit: '°C', bytes: 1, decode: (A) => A - 40 },
  '010B': { name: 'Intake MAP', unit: 'kPa', bytes: 1, decode: (A) => A },
  '010C': { name: 'Engine RPM', unit: 'RPM', bytes: 2, decode: (A, B) => ((A * 256) + B) / 4 },
  '010D': { name: 'Vehicle Speed', unit: 'km/h', bytes: 1, decode: (A) => A },
  '010F': { name: 'Intake Air Temp', unit: '°C', bytes: 1, decode: (A) => A - 40 },
  '0110': { name: 'MAF Air Flow', unit: 'g/s', bytes: 2, decode: (A, B) => ((A * 256) + B) / 100 },
  '0111': { name: 'Throttle Position', unit: '%', bytes: 1, decode: (A) => (A * 100) / 255 },
  '0114': { name: 'O2 Sensor B1S1', unit: 'V', bytes: 2, decode: (A) => A / 200 },
  '012F': { name: 'Fuel Level', unit: '%', bytes: 1, decode: (A) => (A * 100) / 255 },
  '0142': { name: 'Control Module Voltage', unit: 'V', bytes: 2, decode: (A, B) => ((A * 256) + B) / 1000 },
  '0146': { name: 'Ambient Air Temp', unit: '°C', bytes: 1, decode: (A) => A - 40 },
};

/** Build the raw request frame for a PID, e.g. "010C" -> "01 0C". */
export function buildRequest(pid) {
  const mode = pid.slice(0, 2);
  const id = pid.slice(2);
  return `${mode} ${id}`;
}

/**
 * Parse a raw ELM327-style hex response line (e.g. "41 0C 1A F8") for a given PID.
 * Returns the decoded { value, unit, name } or null if malformed / no data.
 */
export function parseResponse(pid, hexLine) {
  const def = PIDS[pid];
  if (!def || !hexLine) return null;
  const bytes = hexLine.trim().split(/\s+/).map((b) => parseInt(b, 16));
  // Expect: [41, PID, A, B, C, D...] — 41 = Mode 01 positive response offset.
  const dataStart = 2;
  const data = bytes.slice(dataStart, dataStart + def.bytes);
  if (data.some((b) => Number.isNaN(b))) return null;
  const value = def.decode(...data);
  return { name: def.name, unit: def.unit, value: Math.round(value * 100) / 100 };
}

/** DTC (fault code) byte-pair decoder, e.g. bytes [0x03, 0x00] -> "P0300". */
export function decodeDTC(byteA, byteB) {
  const systemMap = ['P', 'C', 'B', 'U'];
  const system = systemMap[(byteA & 0xc0) >> 6];
  const firstDigit = (byteA & 0x30) >> 4;
  const rest = ((byteA & 0x0f) << 8) | byteB;
  return `${system}${firstDigit}${rest.toString(16).toUpperCase().padStart(3, '0')}`;
}
