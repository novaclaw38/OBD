import { decodeDtcBytes, parseDtcResponse } from '../dtc';

describe('DTC byte decoding', () => {
  it('decodes a P0 code (prefix bits 00)', () => {
    // P0301: P=00, first digit 0, then 3,0,1
    expect(decodeDtcBytes(0x03, 0x01)).toBe('P0301');
  });

  it('decodes a C0 code (prefix bits 01)', () => {
    expect(decodeDtcBytes(0x40, 0x35)).toBe('C0035');
  });

  it('decodes a B0 code (prefix bits 10)', () => {
    expect(decodeDtcBytes(0x80, 0x01)).toBe('B0001');
  });

  it('decodes a U0 code (prefix bits 11)', () => {
    expect(decodeDtcBytes(0xc1, 0x00)).toBe('U0100');
  });

  it('treats 00 00 as padding, not a code', () => {
    expect(decodeDtcBytes(0x00, 0x00)).toBeNull();
  });
});

describe('parseDtcResponse', () => {
  it('parses multiple codes and attaches known descriptions', () => {
    const codes = parseDtcResponse([0x03, 0x01, 0x04, 0x20], 'stored');
    expect(codes).toHaveLength(2);
    expect(codes[0]).toMatchObject({ code: 'P0301', status: 'stored' });
    expect(codes[0].description).toContain('Misfire');
    expect(codes[1].code).toBe('P0420');
  });

  it('skips zero-padding pairs', () => {
    const codes = parseDtcResponse([0x03, 0x01, 0x00, 0x00], 'pending');
    expect(codes).toHaveLength(1);
    expect(codes[0].status).toBe('pending');
  });

  it('marks unrecognized codes with a fallback description', () => {
    const codes = parseDtcResponse([0x3f, 0xff], 'stored');
    expect(codes[0].description).toBe('Unknown / manufacturer-specific code');
  });

  it('returns an empty array for an all-zero payload', () => {
    expect(parseDtcResponse([0x00, 0x00], 'stored')).toHaveLength(0);
  });
});
