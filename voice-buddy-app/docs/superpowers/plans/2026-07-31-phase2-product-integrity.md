# Phase 2: Product Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the age-personalization system that is currently dead code,
and move paid lesson content out of the public JavaScript bundle.

**Architecture:** Two independent tasks. Task 1 collects `childAge` at
onboarding and threads it through the LLM prompt, narration picker, and lesson
ordering — turning ~6 existing read sites from no-ops into real behaviour.
Task 2 moves course content from `src/utils/courses.js` into server-only
modules behind two authenticated endpoints, so entitlement is enforced by the
server rather than by UI that ships the content anyway.

**Tech Stack:** React 18, Vite 5, react-router-dom 6, Supabase (auth + Postgres),
Vercel serverless functions (`api/*.js`), Vitest + @testing-library/react.

## Global Constraints

- **Pre-launch, zero existing users.** No migration, backfill, or one-time
  prompt is needed for `childAge` — make it required at onboarding and treat
  its absence as a bug, not a supported state.
- **Mobile-first / tablet.** Touch targets ≥ 44px. The age selector is used by
  a parent on a phone.
- Entitlement is authoritative **server-side only** via `isEntitled(userId)`
  in `api/_auth.js:35`. Client `isPro` from `useSubscription()` is a UX hint.
- Vercel functions in `api/` are plain ESM default-export `(req, res)` handlers,
  outside Vite's bundler. `vercel.json` rewrites all non-filesystem routes to
  `index.html`; `/api/*` resolves ahead of that rewrite and is unaffected.
- Reuse `authHeaders()` from `src/services/chatService.js:4` for authenticated
  fetches — do not re-implement token plumbing.
- Course **catalog** (titles, descriptions, lesson titles, objectives) is the
  sales pitch and stays visible to free users. Only lesson **steps** and
  **printSheet** are entitlement-gated.
- Run `npm test` before every commit. The suite is green at 11 tests today.

---

### Task 1: Collect `childAge` and activate age personalization

**Problem:** `childAge` is read in six places and written in none — it is
absent from `DEFAULTS` (`src/utils/storage.js:25-55`), so every child resolves
to the `|| 7` fallback. Three concrete consequences:

1. `pickNarration` (`src/utils/pickNarration.js:2`) gates `narrationYoung` on
   `childAge <= 6`, which never fires — that authored content is unreachable.
2. `src/utils/prompts.js:1,5` hardcodes *"a 6-year-old child"* twice, so the
   LLM addresses a 3-year-old and a 10-year-old identically.
3. `sortSubjectsForAge` (`src/utils/subjects.js:18-27`) computes `band` and
   never reads it — the function ignores its own age argument.

**Files:**
- Modify: `src/utils/storage.js:25-55` — add `childAge: null` to `DEFAULTS`
- Modify: `src/utils/subjects.js:18-27` — replace `sortSubjectsForAge` with `orderSubjects`; add `lessonsForAge`
- Modify: `src/utils/prompts.js:1-14` — `base(childName, buddyName, childAge)`
- Modify: `src/hooks/useChat.js:58-64` — pass age into `PROMPTS`
- Modify: `src/components/AvatarPicker.jsx` — age selector, required on first run
- Modify: `src/components/AvatarPicker.module.css` — age grid styles
- Modify: `src/pages/ChildPage.jsx:132-143` — persist `childAge` from picker
- Modify: `src/pages/CoursesPage.jsx:30-33,101` — use `orderSubjects` + `lessonsForAge`
- Modify: `src/pages/ParentPage.jsx:520-530` — age field in Child Settings
- Modify: `src/utils/subjects.test.js` — extend
- Create: `src/utils/prompts.test.js`

**Interfaces:**
- Consumes: `BAND_BY_AGE(childAge) => 'young'|'middle'|'old'` (`src/utils/subjects.js:16`); `updateSetting(key, value)` (`src/pages/ParentPage.jsx:222`).
- Produces:
  - `orderSubjects(subjects: Subject[]) => Subject[]` — banded subjects (literacy, numeracy, sel) first, original order preserved within groups. **Replaces `sortSubjectsForAge`; takes no age argument.**
  - `lessonsForAge(course: Course, childAge: number) => Lesson[]` — lessons whose `ageBand` matches the child's band first, original order otherwise.
  - `PROMPTS.chat(childName, buddyName, childAge) => string` and `PROMPTS.sing(...)` — same signature.
  - `AvatarPicker` `onSave` payload gains `age: number`.

- [ ] **Step 1: Write the failing tests for the pure functions**

Replace the whole of `src/utils/subjects.test.js` with:

```js
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
```

Create `src/utils/prompts.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/subjects.test.js src/utils/prompts.test.js`
Expected: FAIL — `orderSubjects` and `lessonsForAge` are not exported, and
`PROMPTS.chat` ignores its third argument.

- [ ] **Step 3: Rewrite the subjects helpers**

In `src/utils/subjects.js`, replace the `sortSubjectsForAge` function and the
`export { BAND_BY_AGE }` line at the end of the file with:

```js
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
```

- [ ] **Step 4: Thread age through the system prompt**

In `src/utils/prompts.js`, replace line 1 with:

```js
const base = (childName, buddyName, childAge = 7) => `You are "${buddyName}", a warm, playful, and encouraging AI friend for a ${childAge}-year-old child named ${childName}.
```

and replace the "Use simple words" bullet with:

```js
- Use simple words a ${childAge}-year-old understands. Short sentences. One idea at a time.
```

Then update both mode builders so they accept and forward the age — change
`chat: (childName, buddyName) =>` to `chat: (childName, buddyName, childAge) =>`
and `base(childName, buddyName)` to `base(childName, buddyName, childAge)`.
Apply the identical change to `sing`.

- [ ] **Step 5: Run the pure-function tests to verify they pass**

Run: `npx vitest run src/utils/subjects.test.js src/utils/prompts.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 6: Pass the age from useChat**

In `src/hooks/useChat.js`, replace the body of `buildSystemPrompt` (lines 58-64) with:

```js
  const buildSystemPrompt = useCallback((currentMode) => {
    const childName  = settings?.childName  || 'there'
    const buddyName  = settings?.buddyName  || 'Buddy'
    const childAge   = settings?.childAge   || 7
    const base = currentMode === 'sing'
      ? PROMPTS.sing(childName, buddyName, childAge)
      : PROMPTS.chat(childName, buddyName, childAge)
    return base + timeContextLine() + memoryRef.current
  }, [settings])
```

- [ ] **Step 7: Add childAge to the settings defaults**

In `src/utils/storage.js`, add this line to `DEFAULTS` immediately after
`childName: '',`:

```js
  childAge: null, // 3-10; required at onboarding — see AvatarPicker
```

- [ ] **Step 8: Add the age selector to the onboarding picker**

In `src/components/AvatarPicker.jsx`, add below the `COSTUMES` array:

```js
const AGES = [3, 4, 5, 6, 7, 8, 9, 10]
```

Change the signature to accept and seed the current age:

```jsx
export default function AvatarPicker({ currentType, currentName, currentColor, currentCostume, currentAge, onSave, onClose, session }) {
  const { isPro } = useSubscription()
  const [selType,  setSelType]  = useState(currentType  || 'bear')
  const [buddyName, setBuddyName] = useState(currentName || 'Buddy')
  const [selCostume, setSelCostume] = useState(currentCostume || null)
  const [selAge, setSelAge] = useState(currentAge ?? null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  // No age on file means this is first-run onboarding: age is required and
  // the sheet can't be dismissed, because every lesson and prompt depends on it.
  const isFirstRun = currentAge == null
```

Replace `handleSave` with:

```jsx
  const handleSave = () => {
    if (selAge == null) return
    onSave({
      type: selType,
      name: buddyName.trim() || 'Buddy',
      color: selAvatar.color,
      costume: isPro ? selCostume : null,
      age: selAge,
    })
  }
```

Insert this block immediately before the `<button className={styles.saveBtn}` element:

```jsx
        {/* Age drives lesson band, narration wording and how Buddy speaks. */}
        <p className={styles.costumeLabel}>How old is your child?</p>
        <div className={styles.ageGrid}>
          {AGES.map((age) => (
            <button
              key={age}
              className={`${styles.ageBtn} ${selAge === age ? styles.selected : ''}`}
              onClick={() => setSelAge(age)}
              aria-pressed={selAge === age}
            >
              {age}
            </button>
          ))}
        </div>
```

Make the save button conditional and hide the escape hatch on first run:

```jsx
        <button className={styles.saveBtn} onClick={handleSave} disabled={selAge == null}>
          Let's go! <IconSparkle size={18} />
        </button>
        {!isFirstRun && (
          <button className={styles.cancelBtn} onClick={onClose}>
```

(keep the existing cancel button's own text and closing tag, wrapping it in the conditional).

- [ ] **Step 9: Style the age grid**

Append to `src/components/AvatarPicker.module.css`:

```css
.ageGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 18px;
}

.ageBtn {
  min-height: 44px;
  border-radius: var(--r-md);
  background: #f3ecfc;
  font-family: var(--font-head);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  border: 2px solid transparent;
  transition: background 0.15s, transform 0.12s;
}

.ageBtn:active { transform: scale(0.95); }

.ageBtn.selected {
  background: linear-gradient(135deg, var(--c-grape), var(--c-berry));
  color: #fff;
  border-color: var(--c-grape-d);
}

.saveBtn:disabled {
  opacity: 0.45;
  pointer-events: none;
}
```

- [ ] **Step 10: Persist the age from ChildPage**

In `src/pages/ChildPage.jsx`, replace `handlePickerSave` with:

```jsx
  const handlePickerSave = ({ type, name, color, costume, age }) => {
    const next = { ...settings, avatarType: type, buddyName: name, avatarColor: color, costume, childAge: age, onboarded: true }
    saveSettings(next)
    setSettings(next)
    setShowPicker(false)
    // Keep the cloud child row (used by the Parent dashboard's child
    // switcher) in sync with the local identity fields.
    const childId = getActiveChildId()
    if (childId) {
      updateChild(childId, { buddyName: name, avatarType: type, avatarColor: color }).catch(() => {})
    }
  }
```

and pass the current age into the picker — add `currentAge={settings.childAge}`
to the `<AvatarPicker ... />` element.

- [ ] **Step 11: Use the new helpers in CoursesPage**

In `src/pages/CoursesPage.jsx`, change the import to:

```jsx
import { SUBJECTS, orderSubjects, lessonsForAge } from '../utils/subjects.js'
```

replace the `orderedSubjects` memo with:

```jsx
  const orderedSubjects = useMemo(
    () => orderSubjects(SUBJECTS).filter(s => COURSES.some(c => c.subject === s.id)),
    []
  )
```

and change the lesson map from `{course.lessons.map((lesson, i) => (` to:

```jsx
                      {lessonsForAge(course, settings.childAge || 7).map((lesson, i) => (
```

- [ ] **Step 12: Add an age field to Parent Settings**

In `src/pages/ParentPage.jsx`, insert immediately after the closing `</div>` of
the Child's Name field:

```jsx
            <div className={styles.field}>
              <label className={styles.label} htmlFor="childAge">Child's Age</label>
              <select
                id="childAge"
                className={styles.input}
                value={settings.childAge ?? ''}
                onChange={(e) => updateSetting('childAge', Number(e.target.value))}
              >
                <option value="" disabled>Select an age</option>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((age) => (
                  <option key={age} value={age}>{age} years old</option>
                ))}
              </select>
              <p className={styles.hint}>
                Sets which lessons are suggested first and how Buddy talks.
              </p>
            </div>
```

- [ ] **Step 13: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS (17 tests), build succeeds.

- [ ] **Step 14: Verify the flow in a browser**

```bash
npm run dev
```

In DevTools console run `localStorage.clear()`, reload `/dev-child`. Expected:
the picker appears, "Let's go!" is disabled until an age is tapped, and no
"Maybe later" button is shown. Pick age 4 and save. Then in the console run
`JSON.parse(localStorage.getItem('buddy_settings')).childAge` — expected `4`.
Navigate to `/dev-courses`, expand Literacy — expected: "Letter Sounds" (the
`young` lesson) listed first. Stop the server.

- [ ] **Step 15: Commit**

```bash
git add src/utils/storage.js src/utils/subjects.js src/utils/subjects.test.js \
        src/utils/prompts.js src/utils/prompts.test.js src/hooks/useChat.js \
        src/components/AvatarPicker.jsx src/components/AvatarPicker.module.css \
        src/pages/ChildPage.jsx src/pages/CoursesPage.jsx src/pages/ParentPage.jsx
git commit -m "feat: collect child age and activate age personalization"
```

---

### Task 2: Move course content behind an authenticated API

**Problem:** All lesson content ships in the public client bundle
(`dist/assets/courses-*.js`, ~148 kB / 41 kB gzip). Phase 1 gated the *UI*, but
anyone who opens the bundle still has every lesson. Entitlement must be enforced
where the content lives.

**Files:**
- Create: `api/_courseData.js` — full course content moved verbatim from `src/utils/courses.js`
- Create: `api/courses.js` — catalog endpoint (auth only)
- Create: `api/lesson.js` — full-lesson endpoint (auth + entitlement)
- Create: `api/lesson.test.js`
- Create: `src/services/courseService.js`
- Create: `src/hooks/useCourseCatalog.js`
- Modify: `src/pages/CoursesPage.jsx` — consume the catalog hook
- Modify: `src/pages/ParentPage.jsx:14,775,797` — consume the catalog hook
- Modify: `src/pages/LessonPage.jsx:3,43` — fetch the full lesson
- Delete: `src/utils/courses.js`

**Interfaces:**
- Consumes: `getUser(req)`, `isEntitled(userId)` (`api/_auth.js:17,35`); `authHeaders()` (`src/services/chatService.js:4`).
- Produces:
  - `GET /api/courses` → `{ courses: CatalogCourse[] }` where
    `CatalogCourse = { id, title, emoji, color, description, subject, lessons: { id, title, emoji, ageBand, objective }[] }`. Auth required, no entitlement.
  - `GET /api/lesson?course=<id>&lesson=<id>` → `{ lesson: Lesson }` with full
    `steps` and `printSheet`. Auth + entitlement; 403 `{ error: { code: 'PRO_REQUIRED' } }` otherwise.
  - `fetchCatalog() => Promise<CatalogCourse[]>`, `fetchLesson(courseId, lessonId) => Promise<Lesson>` from `src/services/courseService.js`.
  - `useCourseCatalog() => { courses: CatalogCourse[], loading: boolean, error: Error|null }`.

- [ ] **Step 1: Move the course data server-side**

```bash
git mv src/utils/courses.js api/_courseData.js
```

The file's `export const COURSES = [...]` needs no edits — it is already plain
ESM with no browser dependencies.

- [ ] **Step 2: Write the failing endpoint test**

Create `api/lesson.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isEntitled: vi.fn(),
}))
vi.mock('./_auth.js', () => mocks)

import handler from './lesson.js'

function mockRes() {
  const res = { statusCode: 0, body: null }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

const req = (query) => ({ method: 'GET', headers: {}, query })

describe('api/lesson entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
  })

  it('rejects an anonymous request with 401', async () => {
    mocks.getUser.mockResolvedValue(null)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'blending-sounds' }), res)
    expect(res.statusCode).toBe(401)
  })

  it('rejects a signed-in free user with 403 PRO_REQUIRED', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'blending-sounds' }), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error.code).toBe('PRO_REQUIRED')
  })

  it('returns the full lesson with steps to an entitled user', async () => {
    mocks.isEntitled.mockResolvedValue(true)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'blending-sounds' }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.lesson.title).toBe('Blending Sounds')
    expect(res.body.lesson.steps.length).toBeGreaterThan(0)
  })

  it('404s an unknown lesson for an entitled user', async () => {
    mocks.isEntitled.mockResolvedValue(true)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'nope' }), res)
    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run api/lesson.test.js`
Expected: FAIL — `./lesson.js` does not exist.

- [ ] **Step 4: Write the catalog endpoint**

Create `api/courses.js`:

```js
import { getUser } from './_auth.js'
import { COURSES } from './_courseData.js'

// The catalog is the sales pitch — titles and learning objectives are what
// convince a parent to subscribe, so any signed-in user may read it. Lesson
// steps live behind api/lesson.js and require entitlement.
const toCatalog = (course) => ({
  id: course.id,
  title: course.title,
  emoji: course.emoji,
  color: course.color,
  description: course.description,
  subject: course.subject,
  lessons: course.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    emoji: l.emoji,
    ageBand: l.ageBand ?? null,
    objective: l.objective ?? null,
  })),
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: { message: 'Sign in to browse courses.' } })

  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).json({ courses: COURSES.map(toCatalog) })
}
```

- [ ] **Step 5: Write the lesson endpoint**

Create `api/lesson.js`:

```js
import { getUser, isEntitled } from './_auth.js'
import { COURSES } from './_courseData.js'

// Full lesson content — steps and the printable worksheet. This is the paid
// product, so entitlement is checked here rather than in the UI, which used to
// ship every lesson to every visitor in the client bundle.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: { message: 'Sign in to open a lesson.' } })

  if (!(await isEntitled(user.id))) {
    return res.status(403).json({ error: { message: 'This lesson is part of Buddy Pro.', code: 'PRO_REQUIRED' } })
  }

  const { course: courseId, lesson: lessonId } = req.query
  const course = COURSES.find((c) => c.id === courseId)
  const lesson = course?.lessons.find((l) => l.id === lessonId)
  if (!lesson) return res.status(404).json({ error: { message: 'Lesson not found.' } })

  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).json({
    lesson,
    course: { id: course.id, title: course.title, emoji: course.emoji },
  })
}
```

- [ ] **Step 6: Run the endpoint test to verify it passes**

Run: `npx vitest run api/lesson.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 7: Write the client service**

Create `src/services/courseService.js`:

```js
import { authHeaders } from './chatService.js'

async function getJson(url) {
  const response = await fetch(url, { headers: await authHeaders() })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (body.error?.code === 'PRO_REQUIRED') throw new Error('PRO_REQUIRED')
    throw new Error(body.error?.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export async function fetchCatalog() {
  const { courses } = await getJson('/api/courses')
  return courses
}

export async function fetchLesson(courseId, lessonId) {
  return getJson(`/api/lesson?course=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(lessonId)}`)
}
```

- [ ] **Step 8: Write the catalog hook**

Create `src/hooks/useCourseCatalog.js`:

```js
import { useState, useEffect } from 'react'
import { fetchCatalog } from '../services/courseService.js'

// Shared by CoursesPage and the Parent dashboard's progress view. The catalog
// is small and rarely changes, so each consumer fetching once on mount is
// cheaper than threading it through context.
export function useCourseCatalog() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchCatalog()
      .then((data) => { if (!cancelled) setCourses(data) })
      .catch((err) => { if (!cancelled) setError(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { courses, loading, error }
}
```

- [ ] **Step 9: Switch CoursesPage to the catalog**

In `src/pages/CoursesPage.jsx`, remove the `import { COURSES } from '../utils/courses.js'`
line and add:

```jsx
import { useCourseCatalog } from '../hooks/useCourseCatalog.js'
```

Inside the component, add `const { courses: COURSES, loading: catalogLoading } = useCourseCatalog()`
immediately after the `useSubscription()` call. Change the `orderedSubjects`
memo dependency array from `[]` to `[COURSES]`, and change the intro-speech
effect's dependency array from `[]` to `[COURSES]` with a guard as its first
line:

```jsx
    if (!COURSES.length) return
```

Then add a loading guard immediately before the component's `return (`:

```jsx
  if (catalogLoading) return <div className={styles.page}><div className={styles.bg} /></div>
```

- [ ] **Step 10: Switch ParentPage to the catalog**

In `src/pages/ParentPage.jsx`, remove the `import { COURSES } from '../utils/courses.js'`
line and add:

```jsx
import { useCourseCatalog } from '../hooks/useCourseCatalog.js'
```

Inside the component, next to the existing `useProgress()` call, add:

```jsx
  const { courses: COURSES } = useCourseCatalog()
```

Both existing usages (the per-course progress bars and the "Recently Learned"
lookup) already read from a `COURSES` array and need no further change — an
empty array during load renders an empty list, which is the correct
intermediate state.

- [ ] **Step 11: Switch LessonPage to the fetched lesson**

In `src/pages/LessonPage.jsx`, remove the `import { COURSES } from '../utils/courses.js'`
line and add:

```jsx
import { fetchLesson } from '../services/courseService.js'
```

Replace the two synchronous lookups (`const course = COURSES.find(...)` and
`const lesson = course?.lessons.find(...)`) with fetched state:

```jsx
  const [lessonData, setLessonData] = useState(null)
  const [lessonError, setLessonError] = useState(null)
  const course = lessonData?.course
  const lesson = lessonData?.lesson

  useEffect(() => {
    if (!courseId || !lessonId || !isPro) return
    let cancelled = false
    fetchLesson(courseId, lessonId)
      .then((data) => { if (!cancelled) setLessonData(data) })
      .catch((err) => { if (!cancelled) setLessonError(err) })
    return () => { cancelled = true }
  }, [courseId, lessonId, isPro])
```

Then change the redirect effect so it only fires once the fetch has actually
failed, rather than during the initial load:

```jsx
  useEffect(() => {
    if (lessonError) navigate('/courses')
  }, [lessonError, navigate])
```

The existing `if (!lesson) return null` guard now covers the loading state, and
the Phase 1 entitlement gate below it is unchanged — it stays as defence in
depth so a free user never even issues the request.

- [ ] **Step 12: Update the Phase 1 entitlement test for the async fetch**

`src/pages/LessonPage.test.jsx` currently asserts lesson content renders
synchronously from the imported `COURSES`. That import is gone, so the Pro-user
case must mock the service and await the render. In that file, add this mock
alongside the existing ones:

```jsx
vi.mock('../services/courseService.js', () => ({
  fetchLesson: vi.fn().mockResolvedValue({
    course: { id: 'literacy', title: 'Literacy', emoji: '📖' },
    lesson: {
      id: 'blending-sounds',
      title: 'Blending Sounds',
      emoji: '🧩',
      objective: 'Blend three letter sounds together to read a simple word.',
      steps: [{ type: 'teach', narration: 'n', emoji: '🐱', fact: 'f' }],
      printSheet: { title: 'Blending Sounds', facts: [], colourPrompt: '', visual: '🐱' },
    },
  }),
}))
```

and change the entitled-user assertion from `getByText` to its async form:

```jsx
  it('renders lesson content for an entitled user', async () => {
    mockSub.isPro = true
    renderLesson()
    expect(await screen.findByText(/Blending Sounds/i)).toBeInTheDocument()
    expect(screen.queryByText(/Unlock All Courses/i)).not.toBeInTheDocument()
  })
```

The free-user case needs no change — it must still find the upgrade prompt and
must never render lesson content, and `fetchLesson` is never called because the
effect short-circuits on `!isPro`. Add that as an explicit assertion:

```jsx
    expect(fetchLesson).not.toHaveBeenCalled()
```

importing `fetchLesson` from the mocked module at the top of the file:

```jsx
import { fetchLesson } from '../services/courseService.js'
```

- [ ] **Step 13: Verify the content is gone from the bundle**

```bash
npm test && rm -rf dist && npm run build
grep -rl "Blending Sounds" dist/assets/*.js && echo "FAIL: lesson content still in bundle" || echo "PASS: content is server-side"
```

Expected: tests PASS, then `PASS: content is server-side`.

- [ ] **Step 14: Verify end to end against the dev server**

```bash
npm run dev
```

`/dev-courses` mints a fake session whose token the API will reject, so the
catalog will fail to load there — that is expected and is itself proof the
endpoint is authenticated. Verify instead with a real signed-in account at
`/courses`: the subject sections render, expanding a course lists its lessons
with objectives, and opening one plays normally. Then, in the console of a
signed-in **free** account, run:

```js
await fetch('/api/lesson?course=literacy&lesson=blending-sounds', {
  headers: { Authorization: 'Bearer ' + (await window.supabase?.auth.getSession())?.data?.session?.access_token },
}).then(r => r.status)
```

Expected: `403`. Stop the server.

- [ ] **Step 15: Commit**

```bash
git add api/_courseData.js api/courses.js api/lesson.js api/lesson.test.js \
        src/services/courseService.js src/hooks/useCourseCatalog.js \
        src/pages/CoursesPage.jsx src/pages/ParentPage.jsx src/pages/LessonPage.jsx
git commit -m "feat: serve course content from authenticated API instead of the client bundle"
```

---

## Phase 2 exit criteria

- [ ] `npm test` passes (21 tests: 11 existing + 6 from Task 1 + 4 from Task 2).
- [ ] `grep -rl "Blending Sounds" dist/assets/*.js` finds nothing after a build.
- [ ] A signed-in free account gets `403 PRO_REQUIRED` from `/api/lesson`.
- [ ] A fresh profile cannot finish onboarding without choosing an age.
- [ ] A 4-year-old's profile sees "Letter Sounds" first in Literacy; a 10-year-old sees "Story Detective" first.
- [ ] The system prompt for a 9-year-old contains "9-year-old" and not "6-year-old".
- [ ] Deployed and re-verified against the live URL.

## Deferred from Phase 2

These were specified in the Phase 1 plan but are **not** in this one, because
each is blocked on a decision only the product owner can make:

- **Parental consent gate** — blocked on whether to pursue COPPA-verifiable
  consent (credit-card/ID check) or rely on the parent-account framing, plus
  legal review of the consent wording. Brainstorm before planning.
- **Weekly parent mastery digest** — blocked on choosing an email provider
  (Resend is the least friction on Vercel) and provisioning an API key and a
  verified sending domain.

## Self-review notes

- **Spec coverage:** Phase 1 plan's Task 7 → this plan's Task 1; Task 8 → Task 2.
  Tasks 9 and 10 are explicitly deferred above rather than silently dropped.
- **Renamed interface:** `sortSubjectsForAge` becomes `orderSubjects` and loses
  its age parameter. `CoursesPage.jsx` is its only caller and is updated in
  Task 1 Step 11; `subjects.test.js` is rewritten in Step 1.
- **Ordering dependency:** Task 1 Step 11 edits `CoursesPage.jsx` to call
  `lessonsForAge(course, ...)` against a client-side `COURSES`; Task 2 Step 9
  then re-points the same component at the fetched catalog. The catalog
  preserves `ageBand`, so `lessonsForAge` keeps working across that change.
  Run Task 1 before Task 2.
- **Known non-goal:** `useChat.js` still reads `settings.childAge || 7`. The
  fallback is retained deliberately as a defence against a corrupted settings
  blob, not as a supported state — onboarding makes age mandatory.
