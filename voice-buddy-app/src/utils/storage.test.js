import { describe, it, expect, beforeEach } from 'vitest'
import { migratePinIfNeeded, hashPin } from './storage.js'

describe('migratePinIfNeeded', () => {
  beforeEach(() => { localStorage.clear() })

  it('never invents a default PIN when none was ever set', async () => {
    const result = await migratePinIfNeeded({ onboarded: true })
    expect(result.parentPinHash).toBeFalsy()
  })

  it('hashes a legacy plaintext PIN and drops the plaintext field', async () => {
    const result = await migratePinIfNeeded({ parentPin: '4821' })
    expect(result.parentPinHash).toBe(await hashPin('4821'))
    expect(result.parentPin).toBeUndefined()
  })

  it('leaves an already-hashed PIN untouched', async () => {
    const existing = await hashPin('9999')
    const result = await migratePinIfNeeded({ parentPinHash: existing })
    expect(result.parentPinHash).toBe(existing)
  })
})
