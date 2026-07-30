# Learn Section Redesign: Real Instruction, Not Button-Tapping

Status: approved · 2026-07-30

## 1. The Problem

Today's Learn section (`CoursesPage` → `LessonPage`) runs every lesson,
regardless of subject or age, through the same fixed six-step template:

```
explain → quiz → explain → label → quiz → activity
```

- `explain` narrates a fact once and auto-advances.
- `quiz` is multiple choice; a wrong pick just resets after a second, with
  no explanation of *why* it was wrong.
- `label` is a tap-in-order matching exercise.
- `activity` records a spoken answer but never evaluates it — any sound
  the mic picks up advances the lesson.
- Age adjustment is a single binary swap (`narrationYoung`) at age 6; a
  4-year-old and a 6-year-old otherwise get identical content.
- Progress is a boolean `Set` of "done" lessons — no signal of *how well*
  a child did, only that they clicked through to the end.

None of this can tell a parent what their child actually learned. This
redesign keeps the parts that work (voice narration, print worksheets,
certificates, the Buddy character) and replaces the instructional core.

## 2. Lesson Architecture

Every lesson now declares:

```js
{
  id, title, emoji, ageBand,     // 'young' (3–5) | 'middle' (6–8) | 'old' (9–10)
  objective,                     // one sentence, parent-facing: what they'll learn
  steps: [ ... ],                // 5–6 steps built from the types below
  printSheet: { ... },           // unchanged from today
}
```

**`objective` is new and load-bearing.** It's shown on the course list next
to the lesson title, spoken by Buddy at the start of the lesson, and echoed
on the reward screen — so "what did my child just do" is never a guess.

**Age bands are separate lessons, not a text swap.** A 3-year-old's colors
lesson and a 9-year-old's fractions lesson don't share a template with a
"simple/hard" toggle — they're different lessons entirely, each authored at
the right depth for that band, grouped together under a subject so a parent
browsing "Numeracy" sees the whole arc: counting (young) → arithmetic
(middle) → fractions (old). This mirrors how the app already scales lesson
*count* by age (fewer, shorter lessons for younger bands) — now the content
itself is purpose-built per band instead of reused.

**Six step types** replace the old four (old ones stay supported for the 8
existing topic courses — see §5):

| Type | Replaces | What it does |
|---|---|---|
| `teach` | `explain` | Delivers the concept, then Buddy asks a quick rhetorical check-question and answers it aloud — reinforcement, not just a fact dump. |
| `practice` | `quiz` | Multiple choice, but a wrong pick gets a spoken, *specific* hint about that misconception before retrying — not a silent reset. |
| `explore` | `label` | Tap-based hands-on practice: sequence, sort-into-two-buckets, or match-pairs — generalizes "tap in order" to the actual mechanics different subjects need. |
| `open-response` | `activity` | Child speaks a real answer; it's evaluated (not just recorded) and gets specific feedback. |
| `story-build` | — (new) | A short branching scenario with authored choices, for lessons where the "practice" is a judgment call, not a fact. |
| `mastery-check` | — (new) | A short cumulative check spanning the lesson's concepts, producing the score that drives the parent-facing mastery tier. |

## 3. Delivery Methods by Subject

### Literacy
- **`teach`**: introduce a letter/sound/word pattern with a concrete
  example ("the word CAT starts with the /k/ sound — like Cat, Car, Cup").
- **`explore` (sequence)**: tap phonemes in order to blend a word (C-A-T →
  "cat"), or tap words in order to build a sentence.
- **`practice`**: "Which word starts with the same sound as SUN?" — wrong
  answers get a hint naming the sound the child actually picked ("that one
  starts with /m/, listen: Sun... Moon...").
- **`open-response`**: "Can you think of a word that rhymes with cat?" —
  sent to the LLM with the objective ("child should produce a word ending
  in -at or a near-rhyme") for age-appropriate evaluation and feedback.
- **`mastery-check`**: 2–3 blends/rhymes/sight words from the lesson.

### Numeracy
- **`teach`**: introduce the concept with a countable/visual anchor
  ("half means splitting something into 2 equal parts — like this cookie 🍪
  cut right down the middle").
- **`explore` (match)**: match a fraction (½) to the picture that shows it
  shaded correctly, or place numbers on a number line.
- **`practice`**: "Which is bigger, ¼ or ½?" — wrong picks get a hint tied
  to the actual mistake ("¼ means 4 equal pieces — more pieces means each
  one is *smaller*, not bigger").
- **`open-response`**: "Tell me in your own words what a fraction is" —
  evaluated for the core idea (equal parts of a whole), not exact wording.
- **`mastery-check`**: 2–3 comparison/identification items.

### Social-Emotional Learning
- **`teach`**: name an emotion and what it feels like in the body ("when
  you're frustrated, your hands might feel tight and your face might feel
  hot").
- **`story-build`**: Buddy narrates a scenario ("Your tower fell down right
  before you finished it — what do you do?") with 2–3 authored choices,
  each with its own spoken outcome; one choice is marked `isIdeal` for
  scoring but *all* choices get a validating, non-judgmental response —
  SEL content teaches through reflection, not "wrong answer, try again."
- **`explore` (match)**: match a facial expression to its feeling word.
- **`open-response`**: "Tell Buddy about a time you felt really happy" —
  evaluated only for whether the child named a feeling and a reason, never
  for "correctness" of the feeling itself.
- **`mastery-check`**: recognize 2–3 feelings from short scenarios.

### Science, Creativity, Problem-Solving (existing courses)
Gardening/science/animals/space (`science`), music (`creativity`), and
robotics (`problem-solving`) keep their current lessons and step types
under the new subject taxonomy (§5) — this redesign doesn't rewrite their
content, only regroups it so the Learn section reads as organized subjects
rather than a flat course grid. Cooking becomes `life-skills`. They're
natural candidates for the same `teach/practice/explore/open-response`
upgrade in a follow-up pass.

## 4. Engagement & Progress

**What keeps each band engaged:**
- **3–5**: short lessons (4–5 steps), heavy on tap-based `explore`, simple
  yes/no `teach` check-questions, concrete visual anchors (emoji-as-object),
  no penalty framing — `story-build` choices are never "wrong."
- **6–8**: `practice` hints that explain *why*, slightly longer
  `open-response` prompts, visible step-dot progress (already exists),
  first appearance of `mastery-check`.
- **9–10**: more `open-response` (explain-in-your-own-words is the deepest
  evidence of understanding at this age), comparison-style `practice`
  questions, `mastery-check` spanning more of the lesson.

**Mastery, not completion:**
Every lesson produces a 0–100 mastery score from its scored steps
(`practice` attempt count, `open-response` LLM judgment, `mastery-check`
result) instead of a boolean. The reward screen shows a tier — 🥉 Bronze
(completed), 🥈 Silver (mostly first-try correct), 🥇 Gold (all first-try
correct/met) — and the parent dashboard lists recent objectives with their
tier, so "completed 12 lessons" becomes "mastered fraction comparison,
letter-sound blending, and naming feelings this week."

## 5. Subject Taxonomy

```js
SUBJECTS = [
  { id: 'literacy',        title: 'Literacy',    emoji: '📖' },
  { id: 'numeracy',        title: 'Numeracy',    emoji: '🔢' },
  { id: 'sel',             title: 'Feelings & Friends', emoji: '💛' },
  { id: 'science',         title: 'Science & Nature',   emoji: '🔬' }, // gardening, science, animals, space
  { id: 'creativity',      title: 'Creativity',  emoji: '🎨' },        // music
  { id: 'problem-solving', title: 'Problem Solving', emoji: '🤖' },    // robotics
  { id: 'life-skills',     title: 'Life Skills', emoji: '🍳' },        // cooking
]
```

`CoursesPage` groups course cards under these section headers, with the
child's current age band's subjects (literacy/numeracy/SEL are the new,
explicitly age-banded ones) sorted to the top — a recommendation, not a
gate; every subject stays browsable.

## 6. Example Lesson Flows

### Literacy · age 6–8 · "Blending Sounds"
**Objective:** *Blend three letter sounds together to read a simple word.*

1. `teach` — "Words are made of sounds stuck together. C-A-T has three
   sounds: /k/ /a/ /t/. Say them slow, then fast, and they become 'cat'!"
   Check-question: "What sound does C-A-T start with? ... That's right,
   /k/!"
2. `practice` — "Which word is this: /d/ /o/ /g/?" options: Dog, Cat, Sun.
   Wrong pick → "That word starts with a different sound — listen again:
   /d/-/o/-/g/... hear the /d/ at the start?"
3. `explore` (sequence) — tap the sounds /s/ /u/ /n/ in the correct order
   to build "sun."
4. `open-response` — "Can you think of a word that rhymes with cat?" →
   sent to LLM with rubric "child should say a word ending in -at or a
   close rhyme; give one encouraging sentence and say whether they got it."
5. `mastery-check` — 2 more blends (e.g. /p/ /i/ /g/, /h/ /a/ /t/).

**How we know they learned it:** correct on first try across `practice` +
`mastery-check`, plus the LLM's met/not-met judgment on the rhyme, rolls
into the mastery score.

### Numeracy · age 9–10 · "Understanding Fractions"
**Objective:** *Compare simple fractions and explain what a fraction means.*

1. `teach` — "A fraction splits something into equal parts. ½ means 2
   equal parts, ¼ means 4 equal parts. More pieces means each piece is
   smaller!" Check-question: "So which is bigger, one out of 2 pieces or
   one out of 4? ... Right, ½ is bigger — fewer, bigger pieces."
2. `practice` — "Which is bigger, ⅓ or ⅙?" Wrong pick → "⅙ means splitting
   into 6 pieces — that's more pieces than 3, so each piece is *smaller*,
   not bigger."
3. `explore` (match) — match ½, ¼, ¾ to the correctly-shaded picture.
4. `open-response` — "Tell me in your own words what a fraction is." →
   LLM rubric: "child should convey 'equal parts of a whole'; don't require
   exact wording."
5. `mastery-check` — 2 more comparisons.

**How we know they learned it:** the `open-response` judgment is the key
signal here — reciting a definition isn't enough evidence at this age;
explaining it in their own words is.

### SEL · age 3–5 · "Naming My Feelings"
**Objective:** *Name three basic feelings and recognize them on a face.*

1. `teach` — "Everybody has feelings! Happy feels like smiling and warm.
   Sad feels like a heavy, quiet feeling. Mad feels hot and tight."
2. `story-build` — "Your ice cream fell on the ground! How do you feel?"
   choices: 😢 Sad ("Yes, that's a sad feeling — it's okay to feel sad
   about that."), 😠 Mad ("That makes sense too — losing your ice cream
   can feel frustrating!"), 😄 Happy ("That's an interesting choice — tell
   Buddy more sometime!"). All responses validate; `isIdeal` (sad/mad) is
   used only for the internal mastery signal, never shown as "wrong."
2. `explore` (match) — match three face emoji to their feeling words.
3. `open-response` — "Tell Buddy about a time you felt happy!" → LLM
   rubric: "child should name any feeling and give any reason; this is
   about expression, not accuracy — always respond warmly."
4. `mastery-check` — simplified: point to the face that matches "sad."

**How we know they learned it:** at this age, mastery is about
*recognition and expression*, not judgment — the score weights `explore`
(can they match feeling ↔ face) and whether `open-response` produced a
named feeling at all, not whether the child's story matched the `isIdeal`
choice.

## 7. What's Out of Scope (for this pass)

- Rewriting the 8 existing topic courses' content into the new step types
  (they keep working as-is; recategorized, not rewritten).
- Spaced-repetition scheduling across sessions (flagged as a natural
  follow-up once mastery scores exist).
- Fully open-ended LLM-generated storytelling for SEL (kept authored/
  deterministic for safety and consistency at these ages).
