import { describe, it, expect } from 'vitest'
import { BAND_BY_AGE } from './subjects.js'

describe('BAND_BY_AGE', () => {
  it('maps each supported age onto its lesson band', () => {
    expect(BAND_BY_AGE(3)).toBe('young')
    expect(BAND_BY_AGE(5)).toBe('young')
    expect(BAND_BY_AGE(6)).toBe('middle')
    expect(BAND_BY_AGE(8)).toBe('middle')
    expect(BAND_BY_AGE(9)).toBe('old')
    expect(BAND_BY_AGE(10)).toBe('old')
  })
})
