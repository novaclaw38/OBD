# Phase 3: Growth Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship story mode as a real Pro feature, make the app installable on
phones, and accept payment from customers outside South Africa.

**Architecture:** Three independent tasks, ordered by risk. Task 1 builds story
mode on the mode scaffolding that already exists (`modeVoice.js` ships a
`story` voice profile) and fixes the missing mode-exit affordance it exposes.
Task 2 generates PWA icons from the existing Buddy avatar geometry and adds a
manifest. Task 3 adds Paddle as a second processor alongside PayFast, selected
by billing country.

**Tech Stack:** React 18, Vite 5, Supabase (auth + Postgres), Vercel serverless
functions, Groq (LLM), Google Cloud TTS, PayFast (ZA) + Paddle (rest of world),
Vitest + @testing-library/react, `sharp` for icon rasterization.

## Global Constraints

- **Story mode is Pro-only.** It is long-form: many LLM tokens and heavy TTS.
  It must never be listed on the free tier. `api/_auth.js:7` already excludes
  `story` from `FREE_MODES`, so the server gate is correct as-is — do not add it.
- **Paddle is merchant of record.** Paddle collects and remits VAT/sales tax.
  Do not build tax logic. PayFast remains the processor for ZA billing country.
- **Non-SA price is $9.99/month USD**, single price for all non-ZA markets.
  ZA stays R149/month via PayFast.
- Entitlement stays authoritative server-side via `isEntitled(userId)`
  (`api/_auth.js:35`), reading `subscriptions.status` + expiry. Both processors
  must converge on that same row shape so `isEntitled` needs no changes.
- **Mobile-first / tablet.** Touch targets ≥ 44px.
- Never commit secrets. `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`,
  `PADDLE_PRICE_ID` are Vercel environment variables.
- Run `npm test` before every commit. The suite is green at 11 tests today (21
  after Phase 2, if that ships first — this plan does not depend on it).

---

### Task 1: Build story mode as a Pro feature

**Problem:** Story mode was advertised on the free tier and stripped in Phase 1
because it did not exist. The scaffolding is already there — `modeVoice.js:6`
defines a warm, slower `story` voice profile, `useChat.switchMode` is
mode-agnostic, and `api/_auth.js:7` already treats `story` as a Pro mode. Only
the prompt, the entry point, and an exit affordance are missing.

**Two gaps this task must also close:**
1. `ChildPage` does not import `UpgradePrompt`, so it currently has no way to
   pitch an upgrade when a free user taps a Pro control.
2. The only `chat.switchMode('chat')` call lives inside SingAlong's `onExit`
   (`src/pages/ChildPage.jsx:649`), and `modeLabel` is a plain `<span>`
   (`:693`). Story mode renders in the normal chat UI, so without a new exit
   control a child would be stuck in story mode until they reload.

**Files:**
- Modify: `src/utils/prompts.js:16-23` — add `PROMPTS.story`; `:26-38` — add `MODE_INTROS.story`
- Modify: `src/pages/ChildPage.jsx` — `handleStartStory`, dock button, upgrade prompt, mode-exit control
- Modify: `src/pages/ChildPage.module.css` — mode-exit button styling
- Modify: `src/components/UpgradePrompt.jsx:8-21` — add a `storyMode` trigger
- Modify: `src/pages/LandingPage.jsx` — list story mode under **Pro**
- Modify: `src/pages/LandingPage.test.jsx` — the "no story mode" assertion must change, not be deleted
- Modify: `src/utils/prompts.test.js` *(exists only if Phase 2 shipped; create it if absent)*

**Interfaces:**
- Consumes: `getModeVoice('story') => { pitchOffset: 2, rateMul: 0.95 }` (`src/utils/modeVoice.js:6`); `chat.switchMode(mode) => string` (`src/hooks/useChat.js:67`); `useSubscription() => { isPro }`.
- Produces: `PROMPTS.story(childName, buddyName, childAge)` — same signature as `chat`/`sing`. `MODE_INTROS.story` — array of 3 intro builders. `ChildPage` gains `handleStartStory` and a `modeExit` control usable by any future non-chat mode.

> **Note on `childAge`:** if Phase 2 has shipped, `PROMPTS` builders take a
> third `childAge` argument. If it has not, they take two. Match whichever
> signature `PROMPTS.chat` currently has in `src/utils/prompts.js` and keep
> `story` consistent with it.

- [ ] **Step 1: Write the failing test**

Create (or extend) `src/utils/prompts.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { PROMPTS, MODE_INTROS } from './prompts.js'

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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/utils/prompts.test.js`
Expected: FAIL — `PROMPTS.story` is not a function.

- [ ] **Step 3: Write the story prompt and intros**

In `src/utils/prompts.js`, add to the `PROMPTS` object after `sing`:

```js
  story: (childName, buddyName, childAge) =>
    base(childName, buddyName, childAge) + `\n\nYou are telling ${childName} an interactive bedtime-style story. Start by offering two or three story ideas (a brave little fox, a rocket to a candy planet, a lost puppy finding home) and let ${childName} pick one — or invent their own. Tell the story in SHORT chunks of two or three sentences, then STOP and ask ${childName} what happens next, or give them two choices to pick between. Weave whatever they say into the story, however silly. Give characters funny voices and sound effects. Keep the whole story gentle and warm — no real peril, nothing frightening. When the story reaches a natural ending, wrap it up cosily and ask if they'd like another one.`,
```

and add to `MODE_INTROS` after `sing`:

```js
  story: [
    (childName, buddyName) => `Story time, ${childName}! Should I tell you about a brave little fox, a rocket ship, or something you make up?`,
    (childName, buddyName) => `Ooh, I love stories! ${childName}, do you want an adventure, a silly one, or a sleepy one?`,
    (childName, buddyName) => `Snuggle in, ${childName} — ${buddyName} has a story for you! What should it be about?`,
  ],
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/prompts.test.js`
Expected: PASS.

- [ ] **Step 5: Add the upgrade trigger copy**

In `src/components/UpgradePrompt.jsx`, add to `TRIGGERS` (the existing `story`
key is a *different* feature — parent-submitted story ideas — so use a
distinct key):

```jsx
  storyMode:  { title: 'Unlock Story Time',              sub: 'Interactive stories with Buddy are part of Buddy Pro' },
```

- [ ] **Step 6: Give ChildPage an upgrade prompt and a story entry point**

In `src/pages/ChildPage.jsx`, add the import:

```jsx
import UpgradePrompt from '../components/UpgradePrompt.jsx'
```

add the state next to the other overlay state (near `const [showPin, setShowPin] = useState(false)`):

```jsx
  const [upgradeTrigger, setUpgradeTrigger] = useState(null)
```

and add the handler immediately after `handleStartSing`:

```jsx
  const handleStartStory = useCallback(() => {
    if (!isPro) { setUpgradeTrigger('storyMode'); return }
    cancelBubbleClear()
    const intro = chat.switchMode('story')
    setBuddyText(intro)
    setUserText('')
    setUiStatus('speaking')
    speech.speak(intro, () => {
      setUiStatus('idle')
      scheduleBubbleClear()
    }, getModeVoice('story'))
  }, [isPro, chat, speech, scheduleBubbleClear, cancelBubbleClear])
```

- [ ] **Step 7: Add the exit-mode control**

Story mode renders in the normal chat UI, so the child needs a way back.
Replace the `modeLabel` span (`src/pages/ChildPage.jsx:692-694`) with a button:

```jsx
              {chat.mode !== 'chat' && (
                <button
                  className={styles.modeLabel}
                  onClick={handleExitMode}
                  aria-label={`Leave ${chat.mode} mode`}
                >
                  {chat.mode} mode ✕
                </button>
              )}
```

and add the handler immediately after `handleStartStory`:

```jsx
  // Any non-chat mode that renders in the normal UI needs a way out — without
  // this a child is stuck in story mode until they reload the page.
  const handleExitMode = useCallback(() => {
    cancelBubbleClear()
    const intro = chat.switchMode('chat')
    setBuddyText(intro)
    setUserText('')
    setUiStatus('speaking')
    speech.speak(intro, () => {
      setUiStatus('idle')
      scheduleBubbleClear()
    })
  }, [chat, speech, scheduleBubbleClear, cancelBubbleClear])
```

- [ ] **Step 8: Add the dock button and render the upgrade prompt**

In `src/pages/ChildPage.jsx`, add a Story button to the left dock group, between
Songs and Learn:

```jsx
                <button className={styles.dockBtn} onClick={handleStartStory}>
                  <span className={`${styles.dockIcon} ${styles.dockBerry}`}><IconSparkle size={26} /></span>
                  <span className={styles.dockLabel}>Story</span>
                </button>
```

`IconBook` is already taken by **Learn** — two identical icons side by side in
the same dock would be unreadable for a pre-reader, so Story uses
`IconSparkle`. Add it to the existing icons import in `ChildPage.jsx`:

```jsx
import { IconMail, IconCamera, IconPlay, IconMusic, IconBook, IconPalette, IconGear, IconSparkle } from '../components/icons.jsx'
```

Then render the prompt near the other overlays, just before the PIN gate block:

```jsx
      {upgradeTrigger && (
        <UpgradePrompt
          session={session}
          trigger={upgradeTrigger}
          onClose={() => setUpgradeTrigger(null)}
        />
      )}
```

- [ ] **Step 9: Style the mode-exit button and the third dock icon**

Append to `src/pages/ChildPage.module.css`:

```css
/* modeLabel is now a button; keep its look, add an affordance. */
.modeLabel {
  border: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.55);
  border-radius: var(--r-pill);
  padding: 4px 12px;
  min-height: 44px;
}

.modeLabel:active { transform: scale(0.96); }

.dockBerry { background: linear-gradient(150deg, var(--c-berry), var(--c-grape-d)); }

/* Three buttons on the left, two on the right — tighten the gap so the mic
   stays centred on narrow phones. */
.dockSide { gap: 8px; }
```

- [ ] **Step 10: Restore story mode to the pricing page — under Pro**

In `src/pages/LandingPage.jsx`, add to the **Pro** feature list, after the
"Unlimited daily messages" item:

```jsx
              <li className={styles.yes}><IconCheck size={14} /> Interactive story time</li>
```

Do **not** add it to the free list.

- [ ] **Step 11: Update the Phase 1 honesty test**

`src/pages/LandingPage.test.jsx` currently asserts story mode appears nowhere.
That assertion was correct while the feature did not exist; now it must assert
the feature is sold on the *right tier*. Replace the first test with:

```jsx
  it('does not advertise features that are not implemented', () => {
    renderLanding()
    expect(screen.queryByText(/10 activity modes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/wake word/i)).not.toBeInTheDocument()
  })

  it('sells story time under Pro, never on the free tier', () => {
    renderLanding()
    const storyItem = screen.getByText(/interactive story time/i)
    expect(storyItem).toBeInTheDocument()
    // The free plan card must not contain it.
    const freeCard = screen.getByText('Free').closest('div')
    expect(freeCard.textContent).not.toMatch(/story/i)
  })
```

- [ ] **Step 12: Run the suite and build**

Run: `npm test && npm run build`
Expected: PASS, build succeeds.

- [ ] **Step 13: Verify in a browser**

```bash
npm run dev
```

At `/dev-child`, tap **Story**. Expected on a non-Pro session: the "Unlock Story
Time" prompt. To exercise the happy path, temporarily stub entitlement by
editing `useSubscription`'s fallback return to `isPro: true`, reload, tap Story
— expected: Buddy offers story choices in a slightly slower, warmer voice, the
top bar shows "story mode ✕", and tapping it returns to chat. **Revert the stub
before committing.** Stop the server.

- [ ] **Step 14: Commit**

```bash
git add src/utils/prompts.js src/utils/prompts.test.js src/pages/ChildPage.jsx \
        src/pages/ChildPage.module.css src/components/UpgradePrompt.jsx \
        src/pages/LandingPage.jsx src/pages/LandingPage.test.jsx
git commit -m "feat: add interactive story mode as a Pro feature"
```

---

### Task 2: Make the app installable (PWA)

**Problem:** `index.html:7-9` declares `mobile-web-app-capable` and
`apple-mobile-web-app-capable`, but there is no `manifest.json` and no icon of
any kind in `public/` — not even a favicon. Android shows no install prompt,
and an iOS home-screen shortcut gets a blank/screenshot icon.

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon.svg` (source of truth for rasterization)
- Generate: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `public/favicon.ico`
- Modify: `index.html:3-14` — manifest + icon links
- Create: `public/manifest.webmanifest`
- Modify: `package.json` — `sharp` devDependency, `icons` script

**Interfaces:**
- Consumes: the Buddy body geometry from `src/components/BuddyAvatar.jsx:18-19` (`BLOB_PATH`) and the brand purple `#7c3aed` from `index.html:6`.
- Produces: `npm run icons` regenerates every raster from `public/icons/icon.svg`. Manifest `name: "Buddy"`, `short_name: "Buddy"`, `display: "standalone"`, `theme_color: "#7c3aed"`.

- [ ] **Step 1: Install the rasterizer**

```bash
npm install -D sharp@^0.33
```

- [ ] **Step 2: Author the icon source**

Create `public/icons/icon.svg`. This reuses the Buddy blob body path and adds
ears and eyes, scaled to ~72% of the canvas so it survives maskable safe-zone
cropping:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
    <radialGradient id="body" cx="38%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#fbbf6e"/>
      <stop offset="100%" stop-color="#e08b2e"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- Buddy, centred at 72% scale: safe inside the maskable 80% circle. -->
  <g transform="translate(256 256) scale(3.7) translate(-50 -58)">
    <circle cx="24" cy="30" r="13" fill="url(#body)"/>
    <circle cx="76" cy="30" r="13" fill="url(#body)"/>
    <path d="M50 18 C76 18 90 37 90 60 C90 85 73 97 50 97 C27 97 10 85 10 60 C10 37 24 18 50 18 Z" fill="url(#body)"/>
    <ellipse cx="42" cy="40" rx="22" ry="14" fill="rgba(255,255,255,0.18)"/>
    <circle cx="26" cy="64" r="8" fill="rgba(255,120,120,0.30)"/>
    <circle cx="74" cy="64" r="8" fill="rgba(255,120,120,0.30)"/>
    <circle cx="35" cy="52" r="9" fill="#ffffff"/>
    <circle cx="65" cy="52" r="9" fill="#ffffff"/>
    <circle cx="35" cy="52" r="5" fill="#1e1b4b"/>
    <circle cx="65" cy="52" r="5" fill="#1e1b4b"/>
    <circle cx="36.6" cy="50" r="1.8" fill="#ffffff"/>
    <circle cx="66.6" cy="50" r="1.8" fill="#ffffff"/>
    <ellipse cx="50" cy="74" rx="8" ry="6" fill="rgba(60,20,20,0.55)"/>
  </g>
</svg>
```

- [ ] **Step 3: Write the generation script**

Create `scripts/generate-icons.mjs`:

```js
// Rasterizes public/icons/icon.svg into the PNG sizes a PWA manifest needs.
// Re-run with `npm run icons` whenever the source SVG changes.
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'public', 'icons', 'icon.svg')
const out = (name) => join(root, 'public', 'icons', name)

const svg = await readFile(src)

// Standard icons: artwork fills the tile.
await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))

// Maskable: launchers crop to a circle/squircle, so the artwork is inset to
// the 80% safe zone and the brand purple bleeds to the edges.
await sharp(svg)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#6d28d9' })
  .png()
  .toFile(out('icon-maskable-512.png'))

// Favicon: a 32px PNG is accepted by every current browser under the .ico name.
await sharp(svg).resize(32, 32).png().toFile(join(root, 'public', 'favicon.ico'))

console.log('icons written to public/icons/')
```

- [ ] **Step 4: Add the npm script and generate**

Add to `package.json` `"scripts"`:

```json
    "icons": "node scripts/generate-icons.mjs",
```

Then run:

```bash
npm run icons
ls -la public/icons/ public/favicon.ico
```

Expected: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `favicon.ico`
all present and non-zero.

- [ ] **Step 5: Eyeball the icons**

Open `public/icons/icon-192.png` and `icon-maskable-512.png`. Expected: Buddy's
head, ears and eyes clearly readable at 192px; on the maskable version, nothing
important within ~10% of any edge. If the bear is clipped, adjust the `scale()`
factor in `icon.svg` and re-run `npm run icons`.

- [ ] **Step 6: Write the manifest**

Create `public/manifest.webmanifest`:

```json
{
  "name": "Buddy — your child's AI friend",
  "short_name": "Buddy",
  "description": "An always-on companion that tells stories, teaches courses and sings songs.",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f5f3ff",
  "theme_color": "#7c3aed",
  "categories": ["education", "kids"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 7: Link it from index.html**

In `index.html`, add inside `<head>` immediately after the
`apple-mobile-web-app-status-bar-style` meta:

```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

- [ ] **Step 8: Verify the manifest is served and valid**

```bash
npm run build && npm run preview
```

In another shell:

```bash
curl -s http://localhost:4173/manifest.webmanifest | head -5
curl -s -o /dev/null -w "icon-192 HTTP %{http_code}\n" http://localhost:4173/icons/icon-192.png
```

Expected: the JSON body, and `HTTP 200` for the icon.

Then open `http://localhost:4173` in Chrome → DevTools → Application →
Manifest. Expected: no errors, all three icons listed, and "Installability:
page is installable". Stop the preview server.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json scripts/generate-icons.mjs \
        public/icons/ public/favicon.ico public/manifest.webmanifest index.html
git commit -m "feat: make the app installable as a PWA with generated Buddy icons"
```

---

### Task 3: Accept non-SA payment via Paddle

**Problem:** PayFast is South Africa–only, so a parent outside SA cannot
subscribe at all. Paddle is added as merchant of record for everyone else:
Paddle collects and remits VAT/sales tax, which a South African entity selling
into the EU/US/UK otherwise has to handle itself.

> **Blocked on provisioning.** Before Step 1, a Paddle account must exist with:
> a product + monthly price of **$9.99 USD** (note its `pri_...` id), an API
> key, and a webhook destination pointed at `https://<your-domain>/api/paddle-webhook`
> subscribed to `transaction.completed`, `subscription.activated`,
> `subscription.updated` and `subscription.canceled`. Set `PADDLE_API_KEY`,
> `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_ID` and `PADDLE_ENV`
> (`sandbox` | `production`) in Vercel. Use sandbox values for local work.

**Files:**
- Create: `supabase/migrations/2026-07-31-payment-processor.sql`
- Create: `api/paddle-create.js`
- Create: `api/paddle-webhook.js`
- Create: `api/paddle-webhook.test.js`
- Modify: `src/components/UpgradePrompt.jsx:26-40` — pick processor, show local price
- Create: `api/billing-region.js`

**Interfaces:**
- Consumes: `getUser(req)` (`api/_auth.js:17`); the `subscriptions` row shape written by `api/payfast-webhook.js:83-110` (`user_id`, `status`, `subscription_end`, `updated_at`, upsert on `user_id`).
- Produces:
  - `GET /api/billing-region` → `{ region: 'ZA'|'INTL', currency: 'ZAR'|'USD', amount: '149.00'|'9.99' }`
  - `POST /api/paddle-create` → `{ checkoutUrl: string }`
  - `POST /api/paddle-webhook` → 200/400, writes the same `subscriptions` shape as PayFast so `isEntitled` is unchanged.
  - New columns `subscriptions.processor` (`'payfast'|'paddle'`) and `subscriptions.processor_ref`.

- [ ] **Step 1: Add processor columns**

Create `supabase/migrations/2026-07-31-payment-processor.sql`:

```sql
-- Two processors now write this table: PayFast for ZA billing addresses and
-- Paddle (merchant of record) for everyone else. isEntitled() reads only
-- status/expiry, so it is unaffected — these columns exist for support and
-- for routing cancellations to the right provider.
alter table public.subscriptions
  add column if not exists processor text,
  add column if not exists processor_ref text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_processor_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_processor_check
      check (processor is null or processor in ('payfast', 'paddle'));
  end if;
end $$;

-- Existing rows were all PayFast.
update public.subscriptions set processor = 'payfast' where processor is null;
```

Run it in the Supabase SQL editor.

- [ ] **Step 2: Add the region endpoint**

Create `api/billing-region.js`:

```js
import { getUser } from './_auth.js'

// Vercel supplies the caller's country; ZA bills in rand through PayFast,
// everyone else bills in USD through Paddle (merchant of record).
export const ZA_PRICE = { region: 'ZA', currency: 'ZAR', amount: '149.00', symbol: 'R' }
export const INTL_PRICE = { region: 'INTL', currency: 'USD', amount: '9.99', symbol: '$' }

export function regionFor(countryCode) {
  return countryCode === 'ZA' ? ZA_PRICE : INTL_PRICE
}

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: { message: 'Sign in first.' } })

  const country = req.headers['x-vercel-ip-country'] || ''
  return res.status(200).json(regionFor(country))
}
```

- [ ] **Step 3: Write the failing webhook test**

Create `api/paddle-webhook.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

const upsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ upsert }) }),
}))

import handler from './paddle-webhook.js'

const SECRET = 'pdl_ntfset_test_secret'

function signed(body, ts = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(body)
  const h = crypto.createHmac('sha256', SECRET).update(`${ts}:${raw}`).digest('hex')
  return { raw, header: `ts=${ts};h1=${h}` }
}

function mockRes() {
  const res = { statusCode: 0, body: null }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.end = () => res
  return res
}

describe('api/paddle-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PADDLE_WEBHOOK_SECRET = SECRET
    process.env.SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_KEY = 'service-key'
  })

  it('rejects an unsigned request', async () => {
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: {} }, res)
    expect(res.statusCode).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects a request with a bad signature', async () => {
    const { raw } = signed({ event_type: 'subscription.activated' })
    const res = mockRes()
    await handler({ method: 'POST', headers: { 'paddle-signature': 'ts=1;h1=deadbeef' }, rawBody: raw, body: JSON.parse(raw) }, res)
    expect(res.statusCode).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('grants Pro on subscription.activated', async () => {
    const body = {
      event_type: 'subscription.activated',
      data: {
        id: 'sub_123',
        custom_data: { user_id: 'u1' },
        current_billing_period: { ends_at: '2099-01-01T00:00:00Z' },
      },
    }
    const { raw, header } = signed(body)
    const res = mockRes()
    await handler({ method: 'POST', headers: { 'paddle-signature': header }, rawBody: raw, body }, res)
    expect(res.statusCode).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', status: 'active', processor: 'paddle' }),
      { onConflict: 'user_id' }
    )
  })

  it('marks the subscription cancelled on subscription.canceled', async () => {
    const body = { event_type: 'subscription.canceled', data: { id: 'sub_123', custom_data: { user_id: 'u1' } } }
    const { raw, header } = signed(body)
    const res = mockRes()
    await handler({ method: 'POST', headers: { 'paddle-signature': header }, rawBody: raw, body }, res)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', status: 'cancelled' }),
      { onConflict: 'user_id' }
    )
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run api/paddle-webhook.test.js`
Expected: FAIL — `./paddle-webhook.js` does not exist.

- [ ] **Step 5: Write the checkout endpoint**

Create `api/paddle-create.js`:

```js
import { getUser } from './_auth.js'

// Creates a Paddle transaction and hands back its hosted checkout URL, mirroring
// api/payfast-create.js's contract so UpgradePrompt can treat both the same way.
// user_id travels in custom_data and comes back on every webhook.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: { message: 'Sign in to upgrade.' } })

  const apiKey  = process.env.PADDLE_API_KEY
  const priceId = process.env.PADDLE_PRICE_ID
  if (!apiKey || !priceId) return res.status(503).json({ error: { message: 'Paddle not configured' } })

  const host = process.env.PADDLE_ENV === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com'
  const appUrl = process.env.APP_URL || 'https://voice-buddy.vercel.app'

  const response = await fetch(`${host}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      customer: { email: user.email },
      custom_data: { user_id: user.id },
      checkout: { url: `${appUrl}/app?payment=success` },
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('Paddle transaction failed:', response.status, data?.error?.detail || JSON.stringify(data))
    return res.status(502).json({ error: { message: 'Could not start checkout.' } })
  }

  const checkoutUrl = data?.data?.checkout?.url
  if (!checkoutUrl) return res.status(502).json({ error: { message: 'Paddle returned no checkout URL.' } })

  return res.status(200).json({ checkoutUrl })
}
```

- [ ] **Step 6: Write the webhook**

Create `api/paddle-webhook.js`:

```js
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  if (req.rawBody) return req.rawBody          // supplied directly by tests
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

// Paddle signs each webhook as `ts=<unix>;h1=<hmac-sha256 of "ts:rawBody">`.
// Verifying against the raw bytes is the whole point — re-serializing the
// parsed body would change whitespace and break the hash.
function verify(rawBody, header, secret) {
  if (!header || !secret) return false
  const parts = Object.fromEntries(header.split(';').map((p) => p.split('=')))
  if (!parts.ts || !parts.h1) return false
  const expected = crypto.createHmac('sha256', secret).update(`${parts.ts}:${rawBody}`).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(parts.h1, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await readRawBody(req)
  if (!verify(rawBody, req.headers['paddle-signature'], process.env.PADDLE_WEBHOOK_SECRET)) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const event = req.body ?? JSON.parse(rawBody)
  const userId = event?.data?.custom_data?.user_id
  if (!userId) return res.status(400).json({ error: 'Missing user_id' })

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const now = new Date().toISOString()
  const base = {
    user_id: userId,
    processor: 'paddle',
    processor_ref: event?.data?.id ?? null,
    updated_at: now,
  }

  switch (event.event_type) {
    case 'subscription.activated':
    case 'subscription.updated': {
      const endsAt = event?.data?.current_billing_period?.ends_at
      await db.from('subscriptions').upsert(
        { ...base, status: 'active', subscription_end: endsAt ?? null },
        { onConflict: 'user_id' }
      )
      break
    }
    case 'subscription.canceled': {
      await db.from('subscriptions').upsert(
        { ...base, status: 'cancelled' },
        { onConflict: 'user_id' }
      )
      break
    }
    default:
      // transaction.completed and anything else: acknowledge without changing
      // entitlement — subscription.* events are the source of truth.
      break
  }

  return res.status(200).json({ ok: true })
}
```

- [ ] **Step 7: Run the webhook test to verify it passes**

Run: `npx vitest run api/paddle-webhook.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 8: Route the upgrade button by region**

In `src/components/UpgradePrompt.jsx`, add region state and use it to pick the
processor. Add near the existing `useState`:

```jsx
  const [pricing, setPricing] = useState(null)

  useEffect(() => {
    fetch('/api/billing-region', { headers: undefined })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPricing)
      .catch(() => {})
  }, [])
```

(add `useEffect` to the React import). Replace the body of `handleUpgrade`'s
fetch call so it targets the right endpoint and reads the right response key:

```jsx
      const isZA = pricing?.region === 'ZA'
      const res = await fetch(isZA ? '/api/payfast-create' : '/api/paddle-create', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ firstName: 'Parent' }),
      })
      const data = await res.json()
      const url = isZA ? data.paymentUrl : data.checkoutUrl
      if (!url) throw new Error(data?.error?.message || 'Could not start checkout.')
      window.location.href = url
```

importing `authHeaders` from `../services/chatService.js` if it is not already.
Finally, make the displayed price follow the region — replace the hardcoded
`R149` / `/month` block with:

```jsx
        <div className={styles.price}>
          <span className={styles.amount}>{pricing ? `${pricing.symbol}${pricing.amount}` : 'R149.00'}</span>
          <span className={styles.period}>/month</span>
        </div>
```

- [ ] **Step 9: Run the suite and build**

Run: `npm test && npm run build`
Expected: PASS, build succeeds.

- [ ] **Step 10: Verify against Paddle sandbox**

With `PADDLE_ENV=sandbox` and sandbox keys set, deploy to a Vercel preview
(webhooks cannot reach `localhost`). Then:

1. Sign in from a non-ZA IP (or temporarily hardcode `regionFor` to return
   `INTL_PRICE`) and open the upgrade prompt. Expected: `$9.99/month`.
2. Tap upgrade → Paddle sandbox checkout opens. Pay with Paddle's test card.
3. In Supabase, check the `subscriptions` row: expected `status = 'active'`,
   `processor = 'paddle'`, `processor_ref` set, `subscription_end` in the future.
4. Reload the app. Expected: Pro features unlocked — confirming `isEntitled`
   reads Paddle-written rows with no changes.
5. Cancel the subscription in the Paddle dashboard. Expected: the row flips to
   `status = 'cancelled'` and Pro locks again.
6. Confirm a ZA IP still routes to PayFast and shows `R149.00`.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/2026-07-31-payment-processor.sql \
        api/billing-region.js api/paddle-create.js api/paddle-webhook.js \
        api/paddle-webhook.test.js src/components/UpgradePrompt.jsx
git commit -m "feat: accept non-SA payment via Paddle as merchant of record"
```

---

## Phase 3 exit criteria

- [ ] `npm test` passes.
- [ ] A free user tapping **Story** sees "Unlock Story Time", not a story.
- [ ] A Pro user gets an interactive story that pauses for their input, and can leave via the "story mode ✕" control.
- [ ] The free plan card on the pricing page contains no mention of stories.
- [ ] Chrome DevTools → Application → Manifest reports the page as installable.
- [ ] A non-ZA card completes checkout via Paddle and unlocks Pro; a ZA card still completes via PayFast at R149.
- [ ] Cancelling in Paddle flips `subscriptions.status` to `cancelled` and re-locks Pro.
- [ ] Deployed and re-verified against the live URL.

## Self-review notes

- **Test that must change, not break:** `LandingPage.test.jsx` asserts story
  mode appears nowhere (correct in Phase 1, wrong once it exists). Task 1
  Step 11 replaces that assertion with a tier-specific one rather than deleting
  it — the free tier must still never mention stories.
- **Two defects found while planning, fixed here:** `ChildPage` never imported
  `UpgradePrompt`, so it had no way to pitch an upgrade; and `modeLabel` was a
  non-interactive `<span>` with the only `switchMode('chat')` buried in
  SingAlong's overlay, which would have trapped a child in story mode. Task 1
  Steps 6-9 address both.
- **Raw-body requirement:** `api/paddle-webhook.js` sets
  `config.api.bodyParser = false` because the signature is computed over raw
  bytes. Re-serializing a parsed body would change whitespace and fail
  verification — this is the most common way Paddle webhook integrations break.
- **`isEntitled` deliberately untouched.** Both processors converge on the same
  `subscriptions` shape (`status`, `subscription_end`), so entitlement logic
  stays single-sourced at `api/_auth.js:35`.
- **Deferred:** the parental-consent gate and weekly mastery digest remain
  unplanned, still blocked on a legal decision and an email-provider choice
  respectively. They are the last items from the original audit.
