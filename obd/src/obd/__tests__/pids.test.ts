import { getPidDefinition, MODE01_PIDS } from '../pids';

describe('PID decoding', () => {
  it('decodes RPM per SAE formula ((A*256+B)/4)', () => {
    const def = getPidDefinition('0C')!;
    expect(def.decode([0x1a, 0xf8])).toBe(1726);
    expect(def.decode([0x00, 0x00])).toBe(0);
    expect(def.decode([0xff, 0xff])).toBe(16383.8); // rounded to 1 decimal place
  });

  it('decodes vehicle speed as a direct byte value', () => {
    const def = getPidDefinition('0D')!;
    expect(def.decode([0x5a])).toBe(90);
  });

  it('decodes coolant temperature with the -40 offset', () => {
    const def = getPidDefinition('05')!;
    expect(def.decode([0x00])).toBe(-40);
    expect(def.decode([0x7d])).toBe(85);
  });

  it('decodes fuel level as a percentage of 255', () => {
    const def = getPidDefinition('2F')!;
    expect(def.decode([0x80])).toBeCloseTo(50.2, 1);
  });

  it('decodes control module voltage', () => {
    const def = getPidDefinition('42')!;
    expect(def.decode([0x00, 0x00])).toBe(0);
  });

  it('returns undefined for unknown PIDs', () => {
    expect(getPidDefinition('FF')).toBeUndefined();
  });

  it('exposes every table entry keyed by its own pid field', () => {
    Object.entries(MODE01_PIDS).forEach(([key, def]) => {
      expect(def.pid).toBe(key);
    });
  });
});
