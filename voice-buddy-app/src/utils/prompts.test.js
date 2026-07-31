import { describe, it, expect } from 'vitest'
import { PROMPTS } from './prompts.js'

describe('PROMPTS age targeting', () => {
  it('addresses the child at their real age, not a hardcoded 6', () => {
    const prompt = PROMPTS.chat('Ada', 'Buddy', 9)
    expect(prompt).toContain('9-year-old')
    expect(prompt).not.toContain('6-year-old')
  })

  it('applies the same age to sing mode', () => {
    expect(PROMPTS.sing('Ada', 'Buddy', 4)).toContain('4-year-old')
  })
})
