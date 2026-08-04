import { cleanElmResponse, classifyElmError, extractPidData, parseHexLine } from '../response';

describe('cleanElmResponse', () => {
  it('strips the trailing prompt and blank lines', () => {
    expect(cleanElmResponse('41 0C 1A F8\r\r>')).toEqual(['41 0C 1A F8']);
  });

  it('filters known noise lines like SEARCHING...', () => {
    expect(cleanElmResponse('SEARCHING...\r41 0C 1A F8\r>')).toEqual(['41 0C 1A F8']);
  });
});

describe('classifyElmError', () => {
  it('detects NO DATA', () => {
    expect(classifyElmError(['NO DATA'])?.code).toBe('NO_DATA');
  });

  it('detects UNABLE TO CONNECT', () => {
    expect(classifyElmError(['UNABLE TO CONNECT'])?.code).toBe('ADAPTER_ERROR');
  });

  it('detects a bare "?" as malformed', () => {
    expect(classifyElmError(['?'])?.code).toBe('MALFORMED_RESPONSE');
  });

  it('returns null for valid hex data', () => {
    expect(classifyElmError(['41 0C 1A F8'])).toBeNull();
  });
});

describe('parseHexLine', () => {
  it('parses space-separated hex bytes', () => {
    expect(parseHexLine('41 0C 1A F8')).toEqual([0x41, 0x0c, 0x1a, 0xf8]);
  });

  it('returns null for a line with no hex tokens', () => {
    expect(parseHexLine('SEARCHING...')).toBeNull();
  });
});

describe('extractPidData', () => {
  it('strips the mode/PID echo for a Mode 01 response', () => {
    expect(extractPidData('41 0C 1A F8\r>', 1, '0C')).toEqual([0x1a, 0xf8]);
  });

  it('strips a leading CAN header before the mode/PID echo', () => {
    expect(extractPidData('7E8 04 41 0C 1A F8\r>', 1, '0C')).toEqual([0x1a, 0xf8]);
  });

  it('ignores lines whose PID does not match the request', () => {
    expect(extractPidData('41 0D 5A\r41 0C 1A F8\r>', 1, '0C')).toEqual([0x1a, 0xf8]);
  });

  it('throws a typed error on NO DATA', () => {
    expect(() => extractPidData('NO DATA\r>', 1, '0C')).toThrow(
      expect.objectContaining({ code: 'NO_DATA' }),
    );
  });

  it('throws MALFORMED_RESPONSE when no matching frame is found', () => {
    expect(() => extractPidData('41 0D 5A\r>', 1, '0C')).toThrow(
      expect.objectContaining({ code: 'MALFORMED_RESPONSE' }),
    );
  });

  it('handles Mode 03 responses which have no PID echo', () => {
    expect(extractPidData('43 01 33 00 00\r>', 3, '')).toEqual([0x01, 0x33, 0x00, 0x00]);
  });
});
