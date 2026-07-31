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

// Literacy, numeracy and feelings are the explicitly age-banded subjects, so
// they lead. This ordering is deliberately age-independent — bands live on
// lessons, not subjects; see lessonsForAge below.
const BANDED_SUBJECT_IDS = new Set(['literacy', 'numeracy', 'sel'])

export function orderSubjects(subjects) {
  return [...subjects].sort((a, b) => {
    const aBanded = BANDED_SUBJECT_IDS.has(a.id) ? 0 : 1
    const bBanded = BANDED_SUBJECT_IDS.has(b.id) ? 0 : 1
    return aBanded - bBanded
  })
}

// Surfaces the lesson written for this child's band first. Courses authored
// before age bands existed have no `ageBand` and keep their original order.
export function lessonsForAge(course, childAge) {
  const band = BAND_BY_AGE(childAge)
  return [...course.lessons].sort((a, b) => {
    const aMatch = a.ageBand === band ? 0 : 1
    const bMatch = b.ageBand === band ? 0 : 1
    return aMatch - bMatch
  })
}

export { BAND_BY_AGE }
