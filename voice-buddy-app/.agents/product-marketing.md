# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-07-30

## Product Overview
**One-liner:** Buddy — an always-on AI best friend for your child, with a parent dashboard for peace of mind.
**What it does:** Buddy is a voice-first AI companion app for kids that chats, tells stories, sings songs, plays games, and teaches interactive courses (gardening, robotics, science, cooking, animals, space). A companion Parent Dashboard lets parents check in via a live camera view, send voice messages the child hears instantly, request custom bedtime stories, review chat history, print activity sheets, and manage settings/safety controls (PIN-gated).
**Product category:** Kids' AI companion / parental-peace-of-mind app (adjacent to kids' educational apps and parental-monitoring apps).
**Product type:** Consumer mobile/web app (React SPA + Supabase backend), subscription SaaS.
**Business model:** Freemium with a Pro subscription. Free tier: 10 chat messages/day, Story mode, Sing mode. Pro: R149/month (ZAR — South African market) with a 10-day free trial, no card required to start. Billing via PayFast (cancel anytime before day 10 to avoid the charge).

## Target Audience
**Target companies:** N/A — B2C, direct to parents/families.
**Decision-makers:** Parents/guardians of young children (the child is the end user of the "Buddy" chat experience; the parent is the buyer and owns the Parent Dashboard).
**Primary use case:** Give kids a safe, engaging AI companion to talk to, learn from, and be entertained by — while giving parents visibility and control (camera check-ins, voice messages, screen-time limits) without having to hover.
**Jobs to be done:**
- Keep my child engaged/entertained with something safer and more enriching than passive screen time.
- Let me check in on and stay emotionally connected to my child when I can't be physically present (work, another room, errands).
- Help my child learn (reading/stories, basic STEM/life-skills courses) through natural conversation instead of worksheets.
**Use cases:**
- Bedtime story time (including parent-submitted custom story prompts Buddy will offer to tell).
- "Busy parent" moments — parent starts a live camera check or leaves a voice note instead of interrupting their own task.
- Screen-time-conscious use — a "voice only" mode that hides all visuals down to a glowing orb, for reduced screen exposure.
- Daily learning — short conversational lessons across 6 courses (Gardening, Robotics, Science, Cooking, Animals, Space).
- Parent oversight — chat history review, daily time limits, PIN-protected settings.

## Personas
B2C — single primary persona (no multi-stakeholder buying committee).

| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Parent (buyer + admin) | Child safety, screen-time guilt, staying connected while busy, child actually learning something | Limited time/attention, worry about unsupervised screen content, guilt over screen time | An always-safe, always-kind companion plus tools (camera, voice notes, limits) that make "screen time" feel supervised and worthwhile |
| Child (end user, non-buyer) | Fun, being talked to/played with, stories, songs | Boredom, wanting a "friend" that's always available | A responsive, warm AI buddy who chats, sings, tells stories, and plays games with them |

## Problems & Pain Points
**Core problem:** Parents want their child to have engaging, safe screen time and to feel connected to them even when they're not in the room — but generic apps/YouTube offer neither safety guarantees nor a personal connection, and don't teach anything.
**Why alternatives fall short:**
- Passive video/YouTube: no interactivity, no safety curation, no learning, no parent visibility.
- Generic chatbots: not child-safe by design, no parent controls, no "presence" features (camera, voice notes).
- Screen-time/parental-control apps: block or monitor, but don't add positive value or companionship.
**What it costs them:** Screen-time guilt, missed learning opportunities, anxiety about not knowing what content their child is consuming, and the mental load of constantly needing to be present/available.
**Emotional tension:** Guilt (over screen time) vs. relief (child is safe, occupied, and even learning) vs. connection (still feeling present via camera/voice messages while physically absent).

## Competitive Landscape
**Direct:** Other kids' AI companion apps (e.g., emerging "AI friend for kids" products) — likely fall short on the combined parent-dashboard feature set (live camera, voice messages, PIN-gated settings, print-outs) that makes this feel like a full family tool, not just a chatbot skin.
**Secondary:** Kids' educational apps (ABCmouse-style, video-based STEM apps) — solve learning but not companionship/connection or parent presence features.
**Indirect:** Passive screen time (YouTube Kids, tablet games) and traditional babysitting/nanny presence — different approach entirely (no interactivity/safety curation, or a human solution with cost/logistics friction Buddy doesn't have).
*(Note: no competitors were named explicitly in the codebase — validate/refine this section with the user.)*

## Differentiation
**Key differentiators:**
- Combined "child companion + parent presence" model: live camera streaming, instant parent voice notes, and parent-submitted story requests — not just a chatbot.
- Conversational courses (Gardening, Robotics, Science, Cooking, Animals, Space) delivered through natural dialogue rather than screens/worksheets.
- Screen-time-conscious design: a "voice only" mode (glowing orb, no visuals) and parent-set daily time limits with a gentle goodnight screen.
- Customizable Buddy avatar/persona (type, color, name, costumes) so the companion feels personal to each child.
**How we do it differently:** Voice-first, always-on AI companion paired with a full parent control-and-connection surface in one app, rather than either a pure edtech app or a pure monitoring app.
**Why that's better:** Parents get both reassurance (they can see/hear in on their child anytime) and outcome (learning, safe engagement) from a single subscription, instead of stitching together multiple apps.
**Why customers choose us:** *(needs validation — likely: trust/safety, the "peace of mind" camera feature, and the free 10-day trial with no card required lowering signup risk.)*

## Objections & Anti-Personas
| Objection | Response |
|-----------|----------|
| "Is AI safe for my child to talk to unsupervised?" | Buddy is built to be "fully child-safe, always kind" (per landing copy), plus parents get full chat history visibility and PIN-gated settings — nothing is hidden from the parent. |
| "Isn't a live camera feature invasive/creepy?" | It's opt-in, signed-in-parents-only, and framed explicitly as peace-of-mind ("Start Camera" requires an explicit parent confirmation step each time per the app's own UI). |
| "Will this just be more screen time?" | The "voice only / screen-time saver" mode and parent-set daily limits are built specifically to address this. |

**Anti-persona:** *(not yet defined — needs input, e.g. parents of teens, or parents seeking a fully screen-free/no-AI solution.)*

## Switching Dynamics
**Push:** Screen-time guilt, distrust of unmoderated content/chatbots, wanting more than passive entertainment.
**Pull:** The "peace of mind" camera + voice message features, the free 10-day no-card trial, and conversational courses as an edtech angle.
**Habit:** Existing habits around YouTube/tablet games/other apps already installed and familiar to the child.
**Anxiety:** Data/privacy concerns about an AI talking to their child and a live camera feed of their child; concerns about subscription cost after trial ends.

## Customer Language
**How they describe the problem:** *(not yet captured — needs real customer interviews/reviews)*
**How they describe us:** *(not yet captured)*
**Words to use:** peace of mind, buddy/companion, safe, kind, always-on, magical.
**Words to avoid:** "monitoring," "surveillance," "AI chatbot" (generic/impersonal framing) — the product consistently frames itself as a warm companion, not a monitoring tool.
**Glossary:**
| Term | Meaning |
|------|---------|
| Buddy | The child-facing AI companion persona (customizable name/avatar/costume) |
| Parent Dashboard | The `/parent` area — settings, camera, messages, history, print, subscription |
| Voice only / Screen-time saver | Mode that hides all visuals to a glowing orb, audio-only interaction |
| Activity modes | The ~10 interaction modes available to Pro users (chat, sing, story, games, etc.) |

## Brand Voice
**Tone:** Warm, playful, reassuring — "magical," "always-on," child-friendly without being childish in the parent-facing copy.
**Style:** Direct and benefit-led on the landing page (short feature call-outs with icon chips); simple and plain in the Parent Dashboard (functional, no-nonsense settings UI).
**Personality:** Friendly, trustworthy, imaginative, safety-conscious, warm.

## Proof Points
**Metrics:** *(none published yet — no testimonials/logos in the codebase)*
**Customers:** *(none listed)*
**Testimonials:** *(none present)*
**Value themes:**
| Theme | Proof |
|-------|-------|
| Peace of mind | Live camera view of child's screen, signed-in parents only |
| Stay connected | Instant-delivery parent voice messages, played back by Buddy |
| Learning | 6 conversational courses (Gardening, Robotics, Science, Cooking, Animals, Space) |
| Low-risk trial | 10 days free, no card needed; cancel anytime before day 10 |

## Goals
**Business goal:** Convert free-tier/trial signups into paying Pro subscribers (R149/month) in the South African market.
**Conversion action:** "Start Free Trial" → signup → 10-day trial → Pro subscription (PayFast billing).
**Current metrics:** *(not available — no analytics data in the codebase)*

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-07-30) — Initial context, auto-drafted from the voice-buddy-app codebase (LandingPage, AuthPage, ParentPage, courses, package.json). Several sections (competitors, customer language, proof points, anti-persona) are placeholders and need real input from Byron.
