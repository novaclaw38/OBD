import { describe, it, expect } from 'vitest'
import { BAND_BY_AGE, orderSubjects, lessonsForAge } from './subjects.js'

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

describe('orderSubjects', () => {
  it('puts the age-banded subjects first, preserving order within groups', () => {
    const subjects = [
      { id: 'science' }, { id: 'numeracy' }, { id: 'creativity' }, { id: 'literacy' },
    ]
    expect(orderSubjects(subjects).map((s) => s.id))
      .toEqual(['numeracy', 'literacy', 'science', 'creativity'])
  })

  it('does not mutate its input', () => {
    const subjects = [{ id: 'science' }, { id: 'literacy' }]
    orderSubjects(subjects)
    expect(subjects.map((s) => s.id)).toEqual(['science', 'literacy'])
  })
})

describe('lessonsForAge', () => {
  const course = {
    lessons: [
      { id: 'a', ageBand: 'young' },
      { id: 'b', ageBand: 'middle' },
      { id: 'c', ageBand: 'old' },
    ],
  }

  it('surfaces the band matching the child first', () => {
    expect(lessonsForAge(course, 4).map((l) => l.id)).toEqual(['a', 'b', 'c'])
    expect(lessonsForAge(course, 7).map((l) => l.id)).toEqual(['b', 'a', 'c'])
    expect(lessonsForAge(course, 10).map((l) => l.id)).toEqual(['c', 'a', 'b'])
  })

  it('leaves courses without age bands untouched', () => {
    const legacy = { lessons: [{ id: 'x' }, { id: 'y' }] }
    expect(lessonsForAge(legacy, 7).map((l) => l.id)).toEqual(['x', 'y'])
  })
})
