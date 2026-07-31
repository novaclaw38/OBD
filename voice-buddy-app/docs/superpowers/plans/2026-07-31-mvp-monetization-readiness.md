# Voice Buddy MVP & Monetization Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the paywall bypasses, remove false advertising, cap free-tier
spend, and activate the age-personalization system — turning Voice Buddy from
a demo into a build that can legally and profitably take money.

**Architecture:** Three sequenced phases. Phase 1 (Tasks 1–6) is fully
specified and independently shippable — it makes the app honest and the
paywall real. Phase 2 (Tasks 7–10) hardens product integrity. Phase 3
(Tasks 11–13) unlocks growth. Phases 2 and 3 are specified at task level with
exact files, interfaces, and acceptance criteria; **each must be expanded into
its own plan before execution** (see "Expansion Required" notes).

**Tech Stack:** React 18, Vite 5, react-router-dom 6, Supabase (auth + Postgres),
Vercel serverless functions (`api/*.js`), Groq (LLM), Google Cloud TTS,
PayFast (payments). Tests: Vitest + @testing-library/react (added in Task 1).

## Global Constraints

- **Mobile-first / tablet.** Design for touch, not mouse. Tap targets ≥ 44px.
- **No test runner exists today.** Task 1 must land before Tasks 2–13.
- Vercel serverless functions live in `api/` and are plain ESM default-export
  handlers taking `(req, res)`. They are **not** covered by Vite's bundler.
- Entitlement is authoritative **server-side only** via `isEntitled(userId)`
  in `api/_auth.js`. Client `isPro` from `useSubscription()` is a UX hint and
  must never be the only gate on paid content.
- `allowRequest()` **fails open** by design (`api/_auth.js:64-72`). It is a
  cost guard, not a security boundary. Do not rely on it for entitlement.
- Pricing is **R149/month with a 10-day, no-card trial** provisioned
  server-side by `api/ensure-trial.js`. Never restate trial terms as
  "cancel before you're charged" — there is no card on file.
- Only two conversational modes exist: `chat` and `sing`. Do not reference
  "story mode", "10 activity modes", or "wake word" in any user-facing copy
  until the corresponding feature actually ships.
- Never commit secrets. `GOOGLE_TTS_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_KEY`,
  and `PAYFAST_*` are Vercel environment variables.

---

# PHASE 1 — Ship-blockers (Tasks 1–6)

Nothing in Phases 2–3 matters until this phase lands. At the end of Phase 1
the paywall is real, the pricing page is true, and free-tier spend is bounded.

---

### Task 1: Test infrastructure

Nothing else in this plan is verifiable without a test runner. This task adds
Vitest, jsdom, and the DOM stubs the existing components need, then proves the
setup works against a pure function.

**Files:**
- Modify: `package.json` (add devDependencies + `test` scripts)
- Modify: `vite.config.js:4-16` (add `test` block)
- Create: `src/test/setup.js`
- Create: `src/utils/subjects.test.js`

**Interfaces:**
- Consumes: `BAND_BY_AGE(childAge: number) => 'young'|'middle'|'old'` from `src/utils/subjects.js:16`
- Produces: `npm test` (single run) and `npm run test:watch`. All later tasks
  assume `vi`, `describe`, `it`, `expect` are globals and that
  `@testing-library/jest-dom` matchers (`toBeInTheDocument`) are registered.

- [ ] **Step 1: Install the test toolchain**

```bash
npm install -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

- [ ] **Step 2: Add test scripts to package.json**

In `package.json`, replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: Configure Vitest in vite.config.js**

Replace the whole of `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // CSS modules resolve to inert proxies in tests — we assert on text and
    // roles, never on generated class names.
    css: false,
    include: ['src/**/*.test.{js,jsx}', 'api/**/*.test.js'],
  },
  server: {
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.cache/**',
        '**/ovos-installer/**',
        '/home/byron/.cache/**',
      ],
    },
  },
})
```

- [ ] **Step 4: Create the test setup file**

Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest'

// LandingPage's RevealSection observes scroll position; jsdom has no
// IntersectionObserver, so stub it out and never fire the callback.
class IntersectionObserverStub {
  constructor(callback) { this.callback = callback }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
globalThis.IntersectionObserver = IntersectionObserverStub

// useSpeech reads window.speechSynthesis on mount for its browser-TTS
// fallback. jsdom doesn't implement the Web Speech API.
globalThis.speechSynthesis = {
  getVoices: () => [],
  cancel: () => {},
  speak: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
}
```

- [ ] **Step 5: Write the failing test**

Create `src/utils/subjects.test.js`:

```js
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
```

- [ ] **Step 6: Run the test**

Run: `npm test`
Expected: PASS, 1 test file, 1 test. If it fails to start, the Vitest config
or setup file is wrong — fix before continuing.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js src/test/setup.js src/utils/subjects.test.js
git commit -m "test: add vitest + testing-library harness"
```

---

### Task 2: Strip dev-preview routes from production builds

`src/App.jsx:68-71` registers four routes that construct a fake session
(`{ user: { id: 'dev-preview' } }`) with no auth check and no environment
guard. They ship in the production bundle, so `/dev-courses` and
`/dev-lesson` hand the entire Learn section to anonymous visitors.

**Files:**
- Modify: `src/App.jsx:67-71`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `/dev-child`, `/dev-courses`, `/dev-parent`, `/dev-lesson` continue
  to work under `npm run dev` and are absent from `dist/`. Later tasks that
  verify UI in a browser must use `npm run dev`, not `npm run preview`.

- [ ] **Step 1: Confirm the hole exists in the current build**

```bash
npm run build
grep -rl "dev-courses" dist/assets/*.js
```

Expected: prints at least one bundle filename — this is the defect.

- [ ] **Step 2: Guard the routes behind the DEV flag**

In `src/App.jsx`, replace lines 67-71 (the four `/dev-*` `<Route>` elements
and the blank line above them) with:

```jsx
          {/* Dev-only preview routes. Wrapped in import.meta.env.DEV so Vite
              statically eliminates them from production builds — they mint a
              fake session and would otherwise bypass auth and the paywall. */}
          {import.meta.env.DEV && (
            <>
              <Route path="/dev-child" element={<ChildPage session={{ user: { id: 'dev-preview' } }} />} />
              <Route path="/dev-courses" element={<CoursesPage session={{ user: { id: 'dev-preview' } }} />} />
              <Route path="/dev-parent" element={<ParentPage session={{ user: { id: 'dev-preview' } }} />} />
              <Route path="/dev-lesson" element={<LessonPage session={{ user: { id: 'dev-preview' } }} />} />
            </>
          )}
```

React Router v6 accepts a `<Fragment>` inside `<Routes>`, and skips a `false`
child, so both branches are valid.

- [ ] **Step 3: Verify the routes are gone from the production bundle**

```bash
npm run build
grep -rl "dev-courses" dist/assets/*.js || echo "PASS: dev routes stripped"
```

Expected: `PASS: dev routes stripped`

- [ ] **Step 4: Verify they still work in dev**

```bash
npm run dev
```

Open `http://localhost:5173/dev-child` — the child page must still render.
Then stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "fix: strip dev preview routes from production builds"
```

---

### Task 3: Gate LessonPage on entitlement

`src/pages/LessonPage.jsx` has no entitlement check. Gating exists only in
`CoursesPage.handleLesson` (`src/pages/CoursesPage.jsx:56`), so a signed-in
free user who navigates directly to `/lesson?course=literacy&lesson=blending-sounds`
gets the full lesson, narrated.

**Files:**
- Modify: `src/pages/LessonPage.jsx` (imports, hook call, narration effect guard, render guard)
- Create: `src/pages/LessonPage.test.jsx`

**Interfaces:**
- Consumes: `useSubscription() => { isPro: boolean, loading: boolean, tier, daysLeft, refresh }` from `src/hooks/useSubscription.jsx:84`; `UpgradePrompt({ onClose, session, trigger })` from `src/components/UpgradePrompt.jsx:23`.
- Produces: `LessonPage` renders `UpgradePrompt` (trigger `"courses"`) instead
  of lesson content whenever `isPro` is false, and speaks nothing.

- [ ] **Step 1: Write the failing test**

Create `src/pages/LessonPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mutable so each test can flip entitlement before rendering.
const mockSub = { isPro: false, loading: false, tier: 'free', daysLeft: null, refresh: vi.fn() }

vi.mock('../hooks/useSubscription.jsx', () => ({
  useSubscription: () => mockSub,
  SubscriptionProvider: ({ children }) => children,
}))

vi.mock('../hooks/useSpeech.js', () => ({
  useSpeech: () => ({
    speak: vi.fn(), stopSpeaking: vi.fn(),
    startListening: vi.fn(), stopListening: vi.fn(),
    status: 'idle', transcript: '', voices: [],
    supported: { stt: true, tts: true },
    audioRef: { current: null }, boundaryWordRef: { current: -1 },
  }),
}))

vi.mock('../hooks/useProgress.js', () => ({
  useProgress: () => ({ completions: new Set(), records: new Map(), markComplete: vi.fn() }),
  masteryTier: () => 'gold',
}))

// UpgradePrompt imports the real supabase client, which needs env vars.
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import LessonPage from './LessonPage.jsx'

const renderLesson = () =>
  render(
    <MemoryRouter initialEntries={['/lesson?course=literacy&lesson=blending-sounds']}>
      <LessonPage session={{ user: { id: 'u1' } }} />
    </MemoryRouter>
  )

describe('LessonPage entitlement gate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows the upgrade prompt and no lesson content to a free user', () => {
    mockSub.isPro = false
    renderLesson()
    expect(screen.getByText(/Unlock All Courses/i)).toBeInTheDocument()
    expect(screen.queryByText(/Blending Sounds/i)).not.toBeInTheDocument()
  })

  it('renders lesson content for an entitled user', () => {
    mockSub.isPro = true
    renderLesson()
    expect(screen.getByText(/Blending Sounds/i)).toBeInTheDocument()
    expect(screen.queryByText(/Unlock All Courses/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/LessonPage.test.jsx`
Expected: FAIL — the free-user case finds "Blending Sounds" because no gate exists.

- [ ] **Step 3: Import the subscription hook and UpgradePrompt**

In `src/pages/LessonPage.jsx`, add to the import block (after the
`useProgress` import):

```jsx
import { useSubscription } from '../hooks/useSubscription.jsx'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
```

- [ ] **Step 4: Read entitlement inside the component**

In `src/pages/LessonPage.jsx`, immediately after the line
`const { markComplete } = useProgress()`, add:

```jsx
  const { isPro, loading: subLoading } = useSubscription()
```

Also change the component signature from `export default function LessonPage() {`
to:

```jsx
export default function LessonPage({ session }) {
```

- [ ] **Step 5: Stop narration for non-entitled users**

In the narration `useEffect`, change the guard line `if (!lesson) return` to:

```jsx
    if (!lesson || !isPro) return
```

and change the dependency array on that effect from `}, [stepIndex])` to:

```jsx
  }, [stepIndex, isPro]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 6: Add the render guard**

In `src/pages/LessonPage.jsx`, immediately after the existing
`if (!lesson) { return null }` block, add:

```jsx
  // Entitlement is re-checked here because CoursesPage's gate only covers the
  // in-app tap path — a direct link to /lesson must not hand over paid content.
  if (subLoading) return null
  if (!isPro) {
    return (
      <UpgradePrompt
        session={session}
        trigger="courses"
        onClose={() => navigate('/courses')}
      />
    )
  }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/pages/LessonPage.test.jsx`
Expected: PASS, 2 tests.

- [ ] **Step 8: Verify the full suite still passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/pages/LessonPage.jsx src/pages/LessonPage.test.jsx
git commit -m "fix: gate LessonPage on entitlement to close paywall bypass"
```

---

### Task 4: Remove false advertising from all paid-conversion surfaces

The pricing page sells "Story mode" (free tier), "All 10 activity modes", and
"Wake word" — none of which exist. Only `chat` and `sing` are implemented
(`src/utils/prompts.js:16-23`). `api/_auth.js:7` also whitelists a
non-existent `story` mode.

**Files:**
- Modify: `src/pages/LandingPage.jsx:425-460` (free + Pro feature lists, trial copy)
- Modify: `src/components/UpgradePrompt.jsx:14` (courses trigger copy), `:60-66` (perks list)
- Modify: `api/_auth.js:7` (FREE_MODES)
- Create: `src/pages/LandingPage.test.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: no user-facing surface references story mode, "10 activity modes",
  or wake word. `FREE_MODES` becomes `new Set(['chat', 'sing'])`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/LandingPage.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import LandingPage from './LandingPage.jsx'

const renderLanding = () =>
  render(<MemoryRouter><LandingPage /></MemoryRouter>)

describe('LandingPage pricing honesty', () => {
  it('does not advertise features that are not implemented', () => {
    renderLanding()
    expect(screen.queryByText(/story mode/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/10 activity modes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/wake word/i)).not.toBeInTheDocument()
  })

  it('states the trial terms without implying a card is on file', () => {
    renderLanding()
    expect(screen.queryByText(/won't be charged/i)).not.toBeInTheDocument()
    expect(screen.getByText(/no card needed/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/LandingPage.test.jsx`
Expected: FAIL on all assertions — the copy is still there.

- [ ] **Step 3: Correct the free-tier feature list**

In `src/pages/LandingPage.jsx`, replace the free plan's `<ul className={styles.planFeatures}>` contents with:

```jsx
              <li className={styles.yes}><IconCheck size={14} /> Chat with Buddy (10/day)</li>
              <li className={styles.yes}><IconCheck size={14} /> Sing-along mode</li>
              <li className={styles.no}><IconX size={14} /> Live camera</li>
              <li className={styles.no}><IconX size={14} /> Parent voice messages</li>
              <li className={styles.no}><IconX size={14} /> Courses &amp; lessons</li>
              <li className={styles.no}><IconX size={14} /> Progress tracking</li>
```

- [ ] **Step 4: Correct the Pro feature list and trial copy**

In the same file, replace the Pro plan's `<p className={styles.planDesc}>` block with:

```jsx
            <p className={styles.planDesc}>
              <strong className={styles.trialHighlight}>First 10 days free — no card needed.</strong>{' '}
              We&rsquo;ll ask for payment details on day 10. Then R149/month, cancel anytime.
            </p>
```

and replace the Pro `<ul className={styles.planFeatures}>` contents with:

```jsx
              <li className={styles.yes}><IconCheck size={14} /> Unlimited daily messages</li>
              <li className={styles.yes}><IconCheck size={14} /> All 10 courses — literacy, numeracy, science &amp; more</li>
              <li className={styles.yes}><IconCheck size={14} /> Progress &amp; mastery tracking</li>
              <li className={styles.yes}><IconCheck size={14} /> Peace of mind camera</li>
              <li className={styles.yes}><IconCheck size={14} /> Parent voice messages</li>
              <li className={styles.yes}><IconCheck size={14} /> Avatar &amp; costume customisation</li>
              <li className={styles.yes}><IconCheck size={14} /> Priority support</li>
```

- [ ] **Step 5: Correct the in-app upgrade prompt**

In `src/components/UpgradePrompt.jsx`, replace the `courses` entry in `TRIGGERS` (line 14) with:

```jsx
  courses:    { title: 'Unlock All Courses',             sub: 'Literacy, numeracy, science and more are part of Buddy Pro' },
```

and replace the perks array (lines 60-66) with:

```jsx
          {[
            'Unlimited daily messages',
            'All 10 courses — literacy, numeracy, science & more',
            'Progress & mastery tracking',
            'Peace of mind camera',
            'Parent voice messages',
            'Avatar & costume customisation',
          ].map((perk) => (
```

- [ ] **Step 6: Remove the phantom free mode server-side**

In `api/_auth.js`, replace line 7 with:

```js
const FREE_MODES = new Set(['chat', 'sing'])
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/pages/LandingPage.test.jsx`
Expected: PASS, 2 tests.

- [ ] **Step 8: Verify no stale references remain anywhere**

```bash
grep -rin "wake word\|10 activity modes\|story mode" src/ api/ \
  --exclude=*.test.js --exclude=*.test.jsx \
  && echo "FAIL: stale copy remains" || echo "PASS: no stale claims"
```

Expected: `PASS: no stale claims`. Test files are excluded because
`LandingPage.test.jsx` legitimately contains those strings as negative assertions.

- [ ] **Step 9: Commit**

```bash
git add src/pages/LandingPage.jsx src/pages/LandingPage.test.jsx src/components/UpgradePrompt.jsx api/_auth.js
git commit -m "fix: remove unimplemented features from pricing and upgrade copy"
```

---

### Task 5: Cap free-tier TTS spend

`api/tts.js` checks auth and rate limits but never entitlement, giving free
users 1,000 Google Neural2 calls/day (~$2.40/day worst case) against R149/month
from a paying user. Free users still need *some* TTS — Buddy speaks during
their 10 free chats — so lower their cap rather than blocking them.

**Files:**
- Modify: `api/tts.js:16-32`
- Create: `api/tts.test.js`

**Interfaces:**
- Consumes: `isEntitled(userId) => Promise<boolean>` from `api/_auth.js:35`.
- Produces: free accounts capped at 60 TTS calls/day; entitled accounts keep
  1,000/day. Per-minute cap unchanged at 30 for both.

- [ ] **Step 1: Write the failing test**

Create `api/tts.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  allowRequest: vi.fn(),
  isEntitled: vi.fn(),
}))
vi.mock('./_auth.js', () => mocks)

import handler from './tts.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.send = (b) => { res.body = b; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

const req = { method: 'POST', headers: {}, body: { text: 'hello' } }

describe('api/tts daily caps by entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
    mocks.allowRequest.mockResolvedValue(true)
    process.env.GOOGLE_TTS_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audioContent: Buffer.from('audio').toString('base64') }),
    })
  })

  it('caps a free user at 60 calls per day', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    await handler(req, mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'tts-1d', 60, 86400)
  })

  it('allows an entitled user 1000 calls per day', async () => {
    mocks.isEntitled.mockResolvedValue(true)
    await handler(req, mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'tts-1d', 1000, 86400)
  })

  it('returns 429 once the daily cap is exceeded', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    mocks.allowRequest.mockResolvedValue(false)
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(429)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run api/tts.test.js`
Expected: FAIL — `isEntitled` is never called and the cap is always 1000.

- [ ] **Step 3: Import isEntitled and split the daily limits**

In `api/tts.js`, replace lines 16-19 with:

```js
import { getUser, allowRequest, isEntitled } from './_auth.js'

const RATE_LIMIT_PER_MIN = 30
// Free accounts still need enough TTS to cover their 10 daily chats; the cap
// exists so an unpaid account can never out-spend a paid one on Google TTS.
const FREE_LIMIT_PER_DAY = 60
const PRO_LIMIT_PER_DAY  = 1000
```

- [ ] **Step 4: Apply the entitlement-aware cap**

In `api/tts.js`, replace the rate-limit block (currently lines 28-32, the
comment plus the `if (!(await allowRequest(...)))` statement) with:

```js
  // Cost guard: cap how fast and how much any one account can spend, with a
  // much tighter daily ceiling for accounts that aren't paying.
  const entitled = await isEntitled(user.id)
  const dailyLimit = entitled ? PRO_LIMIT_PER_DAY : FREE_LIMIT_PER_DAY
  if (!(await allowRequest(user.id, 'tts-1m', RATE_LIMIT_PER_MIN, 60)) ||
      !(await allowRequest(user.id, 'tts-1d', dailyLimit, 86400))) {
    return res.status(429).json({ error: 'Too many requests — take a short break.' })
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run api/tts.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add api/tts.js api/tts.test.js
git commit -m "fix: cap free-tier TTS at 60/day to bound unpaid spend"
```

---

### Task 6: Force parent PIN creation, remove the `1234` default

`src/utils/storage.js:106-114` invents a PIN of `1234` for any account that
never set one, so the gate protecting settings, billing and camera ships with
a universally known code. Replace the default with a first-run create flow.

**Files:**
- Modify: `src/utils/storage.js:103-114` (`migratePinIfNeeded`)
- Modify: `src/components/ParentPin.jsx` (add create/confirm mode)
- Modify: `src/pages/ChildPage.jsx` (pass `onCreate` to all four `ParentPin` usages at lines 551, 575, 612, 768)
- Create: `src/utils/storage.test.js`

**Interfaces:**
- Consumes: `hashPin(pin: string) => Promise<string>` from `src/utils/storage.js:97`.
- Produces: `ParentPin({ correctPinHash, onSuccess, onCreate })`. When
  `correctPinHash` is falsy the component renders a two-stage create flow and
  calls `onCreate(hash: string)` once both entries match; it never calls
  `onSuccess` in that mode. `migratePinIfNeeded` leaves `parentPinHash` null
  when no PIN was ever set.

- [ ] **Step 1: Write the failing test**

Create `src/utils/storage.test.js`:

```js
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
```

`hashPin` uses `crypto.subtle`, which Node 18+ exposes as `globalThis.crypto`.
If the test errors with "crypto is not defined", add
`import { webcrypto } from 'node:crypto'` and
`globalThis.crypto ??= webcrypto` to `src/test/setup.js`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/storage.test.js`
Expected: FAIL on the first case — it returns the hash of `1234`.

- [ ] **Step 3: Remove the default-PIN fallback**

In `src/utils/storage.js`, replace the `migratePinIfNeeded` function and its
comment block (lines 103-114) with:

```js
// One-time migration from the old plaintext `parentPin` field to a hash.
// Idempotent — safe to call on every load. Accounts that never set a PIN are
// deliberately left with parentPinHash === null so the parent area forces a
// create flow, rather than shipping a guessable default.
export async function migratePinIfNeeded(settings) {
  if (settings.parentPinHash) return settings
  if (!settings.parentPin) return settings
  const parentPinHash = await hashPin(settings.parentPin)
  const next = { ...settings, parentPinHash }
  delete next.parentPin
  saveSettings(next)
  return next
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/storage.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Add create/confirm mode to ParentPin**

In `src/components/ParentPin.jsx`, change the component signature to:

```jsx
export default function ParentPin({ correctPinHash, onSuccess, onCreate }) {
  // With no PIN on file this is a first-run setup, not a challenge.
  const isSetup = !correctPinHash
  const [stage, setStage] = useState('enter') // 'enter' | 'confirm'
  const [firstPin, setFirstPin] = useState('')
```

and replace the body of `handleDigit` with:

```jsx
  const handleDigit = async (d) => {
    if (locked) return
    const next = input + d
    if (next.length < 4) { setInput(next); return }

    const attempt = next
    setInput('')

    if (isSetup) {
      if (stage === 'enter') {
        setFirstPin(attempt)
        setStage('confirm')
        return
      }
      if (attempt === firstPin) {
        onCreate?.(await hashPin(attempt))
      } else {
        setFirstPin('')
        setStage('enter')
        setShake(true)
        setTimeout(() => setShake(false), 400)
      }
      return
    }

    const attemptHash = await hashPin(attempt)
    if (correctPinHash && attemptHash === correctPinHash) {
      const cleared = { attempts: 0, lockedUntil: 0 }
      setLock(cleared)
      savePinLock(cleared)
      onSuccess()
    } else {
      const tries = lock.attempts + 1
      const nextLock = tries >= MAX_ATTEMPTS
        ? { attempts: 0, lockedUntil: Date.now() + LOCKOUT_MS }
        : { attempts: tries, lockedUntil: 0 }
      setLock(nextLock)
      savePinLock(nextLock)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }
```

Then update the heading text in the component's JSX so setup mode is
self-explanatory — find the existing title element and make it render:

```jsx
        {isSetup
          ? (stage === 'enter' ? 'Create a parent PIN' : 'Re-enter your PIN to confirm')
          : 'Enter your parent PIN'}
```

- [ ] **Step 6: Persist the created PIN from ChildPage**

In `src/pages/ChildPage.jsx`, add this handler next to `handlePickerSave`:

```jsx
  // First-run PIN creation — persist the hash, then treat it as a pass.
  const handlePinCreate = (hash) => {
    const next = { ...settings, parentPinHash: hash }
    saveSettings(next)
    setSettings(next)
  }
```

Then add `onCreate={handlePinCreate}` to every `<ParentPin ... />` in the file
(four usages, at approximately lines 551, 575, 612 and 768).

- [ ] **Step 7: Verify the flow in a browser**

```bash
npm run dev
```

In DevTools console run `localStorage.clear()`, reload `/dev-child`, dismiss
the avatar picker, then tap the Parents button. Expected: "Create a parent PIN",
then a confirm step, then entry to the parent area. Reload and tap Parents
again — expected: "Enter your parent PIN", and `1234` is rejected. Stop the server.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/utils/storage.js src/utils/storage.test.js src/components/ParentPin.jsx src/pages/ChildPage.jsx
git commit -m "fix: force parent PIN creation instead of defaulting to 1234"
```

---

## Phase 1 exit criteria

Before starting Phase 2, all of the following must hold:

- [ ] `npm test` passes.
- [ ] `npm run build && grep -rl "dev-courses" dist/assets/*.js` finds nothing.
- [ ] A free account navigating directly to `/lesson?course=literacy&lesson=blending-sounds`
      sees the upgrade prompt and hears no narration.
- [ ] `grep -rin "wake word\|10 activity modes\|story mode" src/ api/` finds nothing.
- [ ] A fresh profile is forced to create a parent PIN, and `1234` does not work.
- [ ] Deployed to production and re-verified against the live URL.

---

# PHASE 2 — Product integrity (Tasks 7–10)

> **Expansion Required:** Each task below is specified to the level of files,
> interfaces, and acceptance criteria. Before executing, run the
> `superpowers:writing-plans` skill again on the individual task to expand it
> into bite-sized TDD steps. Tasks 9 and 10 additionally require product and
> infrastructure decisions (consent wording, email provider) that must be
> settled in brainstorming first.

---

### Task 7: Collect `childAge` and activate age personalization

**Problem:** `childAge` is read in six places and written in none. It is absent
from `DEFAULTS` (`src/utils/storage.js:25-55`), so every child is treated as 7.
`narrationYoung` content is unreachable, and `src/utils/prompts.js:1` hardcodes
*"a 6-year-old child"* into every system prompt. Additionally
`sortSubjectsForAge` (`src/utils/subjects.js:18-27`) computes `band` and never
uses it — the function ignores age entirely.

**Files:**
- Modify: `src/utils/storage.js:25-55` — add `childAge: null` to `DEFAULTS`
- Modify: `src/components/AvatarPicker.jsx:25` — add an age selector (3–10) to the onboarding sheet; include `age` in the `onSave` payload
- Modify: `src/pages/ChildPage.jsx:132-143` — persist `childAge` in `handlePickerSave`
- Modify: `src/utils/prompts.js:1` — `base(childName, buddyName, childAge)`; interpolate the real age
- Modify: `src/hooks/useChat.js` — pass `settings.childAge` through to `PROMPTS[mode]`
- Modify: `src/utils/subjects.js:18-27` — make `sortSubjectsForAge` actually use `band`; add `lessonsForAge(course, childAge)` that orders the band-matched lesson first
- Modify: `src/pages/CoursesPage.jsx:101` — render lessons via `lessonsForAge`
- Modify: `src/pages/ParentPage.jsx` — expose child age in the Settings tab so it can be corrected later
- Create: `src/utils/prompts.test.js`, extend `src/utils/subjects.test.js`

**Interfaces produced:**
- `lessonsForAge(course: Course, childAge: number) => Lesson[]`
- `sortSubjectsForAge(subjects: Subject[], childAge: number) => Subject[]` — band-matched subjects first
- `PROMPTS[mode](childName: string, buddyName: string, childAge: number) => string`

**Acceptance criteria:**
- Onboarding cannot complete without an age; existing profiles are prompted once.
- `pickNarration` returns `narrationYoung` for a 4-year-old on a step that defines it.
- The system prompt for a 9-year-old contains "9-year-old", not "6-year-old".
- A 4-year-old opening Literacy sees "Letter Sounds" first; a 10-year-old sees "Story Detective" first.

---

### Task 8: Move course content behind an authenticated API

**Problem:** All lesson content ships in the public client bundle
(`dist/assets/courses-*.js`, 147 kB / 40 kB gzip). Task 3 gates the *UI*, but
the content itself is still readable by anyone who opens the bundle.

**Files:**
- Create: `api/courses.js` — returns the marketing catalog (course id, title, emoji, description, subject, lesson ids/titles/objectives) to any signed-in user
- Create: `api/lesson.js` — returns full `steps` and `printSheet` for one lesson, **only** when `isEntitled(user.id)` is true; otherwise 403 with `code: 'PRO_REQUIRED'`
- Create: `api/_courseData.js` — the course content, moved out of `src/`
- Create: `src/utils/courseCatalog.js` — light client-side type/shape helpers only, no content
- Modify: `src/pages/CoursesPage.jsx` — fetch the catalog
- Modify: `src/pages/LessonPage.jsx` — fetch lesson content; keep the Task 3 gate as defence in depth
- Delete: `src/utils/courses.js` (content moves to `api/_courseData.js`)
- Create: `api/lesson.test.js`

**Interfaces produced:**
- `GET /api/courses` → `{ courses: CatalogCourse[] }` (auth required)
- `GET /api/lesson?course=<id>&lesson=<id>` → `{ lesson: Lesson }` (auth + entitlement required)

**Acceptance criteria:**
- `npm run build && grep -rl "Blending Sounds" dist/assets/*.js` finds nothing.
- `curl` to `/api/lesson` with a free user's token returns 403.
- Course cards and objectives still render for free users (they are the sales pitch).

---

### Task 9: Parental consent gate

**Problem:** No age gate, no verifiable parental consent. The app collects a
child's voice and chat text and transmits both to Groq and Google. Under COPPA
this is collection from an under-13 without VPC.

**Expansion blocked on:** legal review of consent wording, and a decision on
whether to pursue COPPA "verifiable" consent (credit-card/ID) or rely on the
school/parent-account framing. Brainstorm before planning.

**Files:**
- Create: `supabase/migrations/2026-XX-XX-parental-consent.sql` — `user_consents (user_id, consented_at, policy_version, ip)`
- Create: `src/components/ConsentGate.jsx`
- Create: `api/consent.js` — records consent server-side
- Modify: `src/App.jsx:63-66` — block `/app`, `/courses`, `/lesson` until consent exists
- Modify: `src/pages/PrivacyPolicyPage.jsx` — align disclosure with what is actually consented to

**Acceptance criteria:**
- A newly signed-up account cannot reach `/app` before accepting.
- Consent is recorded server-side with a policy version, not just localStorage.
- Declining leaves the account usable only for account deletion.

---

### Task 10: Weekly parent mastery digest

**Problem:** Zero retention mechanics — no push, no email, no streaks. A
subscription with no day-2 hook churns near-100%. The mastery data added in the
Learn redesign (`lesson_completions.mastery_score`) is the strongest conversion
asset in the product and is currently visible only behind a PIN.

**Expansion blocked on:** choosing an email provider (Resend is the least
friction on Vercel) and provisioning `RESEND_API_KEY` + a verified sending
domain. Decide before planning.

**Files:**
- Create: `api/cron/weekly-digest.js` — aggregates the last 7 days of `lesson_completions` per parent and sends one email
- Create: `src/emails/weeklyDigest.js` — HTML template listing objectives learned with 🥉/🥈/🥇 tiers
- Modify: `vercel.json` — add a `crons` entry (weekly, Sunday 17:00 UTC)
- Modify: `supabase/migrations/` — add `email_prefs (user_id, weekly_digest bool default true)`
- Modify: `src/pages/ParentPage.jsx` — unsubscribe toggle in the Account tab

**Acceptance criteria:**
- A parent with completions in the last 7 days receives one email listing them.
- A parent with none receives nothing (no empty-state spam).
- Every email carries a working one-click unsubscribe.
- Trial users get a digest on day 8, before the day-10 payment ask.

---

# PHASE 3 — Growth unlock (Tasks 11–13)

> **Expansion Required:** as above. Tasks 11 and 12 also gate on external
> account provisioning.

---

### Task 11: Second payment processor for non-SA cards

**Problem:** PayFast is South Africa–only, capping TAM to SA card-holders and
blocking any future app-store release (Apple Guideline 3.1.1 requires IAP).

**Expansion blocked on:** Stripe vs Paddle decision (Paddle acts as merchant of
record and handles global VAT; Stripe is cheaper but leaves tax to you), plus
account provisioning.

**Files:**
- Create: `api/stripe-create.js`, `api/stripe-webhook.js` (mirroring `api/payfast-create.js:1-35` and `api/payfast-webhook.js`)
- Create: `src/utils/paymentProcessor.js` — picks processor by billing country
- Modify: `src/components/UpgradePrompt.jsx:26` — call the selected processor
- Modify: `supabase/migrations/` — add `subscriptions.processor` + `processor_ref`

**Acceptance criteria:** a ZA card checks out via PayFast, a non-ZA card via the new processor, and both write the same `subscriptions` shape that `isEntitled` already reads.

---

### Task 12: Installable PWA

**Problem:** `index.html:8` declares `apple-mobile-web-app-capable` but there is
no `manifest.json` and no icons anywhere in `public/` — so the app is not
installable on Android and has no home-screen identity on iOS.

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/icon-{192,512,maskable-512}.png`, `public/favicon.ico`
- Modify: `index.html:5-9` — link manifest and icons
- Optional: `vite-plugin-pwa` for offline shell

**Acceptance criteria:** Chrome Android shows an install prompt; Lighthouse PWA installability audit passes.

---

### Task 13: Build story mode for real

**Problem:** Task 4 removed story mode from the pricing page because it doesn't
exist. It is a genuinely valuable selling point and is cheap to add given the
existing mode architecture.

**Files:**
- Modify: `src/utils/prompts.js:16-23` — add `PROMPTS.story`; `:26+` — add `MODE_INTROS.story`
- Modify: `src/pages/ChildPage.jsx` — add `'story'` to the mode switch and dock
- Modify: `api/_auth.js:7` — re-add `'story'` to `FREE_MODES`
- Modify: `src/pages/LandingPage.jsx` — restore "Story mode" to the free tier
- Modify: `src/pages/LandingPage.test.jsx` — the "no story mode" assertion must be replaced, not deleted

**Acceptance criteria:** story mode is reachable, produces multi-turn interactive stories, and is only re-advertised once it ships.

---

## Self-review notes

- **Spec coverage:** all 12 audit recommendations map to a task — P0 items 1–5
  are Tasks 2–6, P1 items 6–9 are Tasks 7–10, P2 items 10–12 are Tasks 11–13.
  Task 1 (test harness) is added because no runner existed.
- **Sequencing risk:** Task 8 (course content to API) supersedes part of Task 3
  (client-side gate). Task 3 must still land first — it is the one-line fix that
  stops the bleeding today, and it remains valid as defence in depth afterwards.
- **Known follow-up not yet tasked:** `allowRequest` fails open on Supabase RPC
  errors (`api/_auth.js:64-72`). Acceptable while it guards only cost, but it
  must not be used for entitlement in Tasks 8–11.
