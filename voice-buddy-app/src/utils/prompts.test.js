import { describe, it, expect } from 'vitest'
import { PROMPTS, MODE_INTROS } from './prompts.js'

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

describe('story mode prompt', () => {
  it('exists and instructs interactive, age-appropriate storytelling', () => {
    const prompt = PROMPTS.story('Ada', 'Buddy', 7)
    expect(prompt).toMatch(/story/i)
    expect(prompt).toMatch(/Ada/)
    // Stories must pause for the child rather than monologue to the end.
    expect(prompt).toMatch(/ask|choose|what happens next/i)
  })

  it('offers several story intros so it does not repeat verbatim', () => {
    expect(MODE_INTROS.story.length).toBeGreaterThanOrEqual(3)
    expect(MODE_INTROS.story[0]('Ada', 'Buddy')).toMatch(/Ada/)
  })
})
