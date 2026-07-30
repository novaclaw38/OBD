// Groups COURSES into subject sections for CoursesPage. See
// docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §5.
export const SUBJECTS = [
  { id: 'literacy', title: 'Literacy', emoji: '📖' },
  { id: 'numeracy', title: 'Numeracy', emoji: '🔢' },
  { id: 'sel', title: 'Feelings & Friends', emoji: '💛' },
  { id: 'science', title: 'Science & Nature', emoji: '🔬' },
  { id: 'creativity', title: 'Creativity', emoji: '🎨' },
  { id: 'problem-solving', title: 'Problem Solving', emoji: '🤖' },
  { id: 'life-skills', title: 'Life Skills', emoji: '🍳' },
]

const BAND_BY_AGE = (age) => (age <= 5 ? 'young' : age <= 8 ? 'middle' : 'old')

// Subjects that are explicitly age-banded (literacy/numeracy/sel) matching
// the child's current band are recommended first; everything else keeps
// its existing order. Browsing isn't restricted — this only reorders.
export function sortSubjectsForAge(subjects, childAge) {
  const band = BAND_BY_AGE(childAge)
  const bandedIds = new Set(['literacy', 'numeracy', 'sel'])
  return [...subjects].sort((a, b) => {
    const aBanded = bandedIds.has(a.id) ? 0 : 1
    const bBanded = bandedIds.has(b.id) ? 0 : 1
    return aBanded - bBanded
  })
}

export { BAND_BY_AGE }
