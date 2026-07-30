# Legal docs compliance fixes — design

Date: 2026-07-30
Status: Approved

## Background

An AI legal review (`legalzoom:review-contract`) of Buddy's newly drafted Terms of
Service, Refund & Cancellation Policy, and Cookie Policy — plus the existing Privacy
Policy and Data Deletion Instructions — flagged one RED and several YELLOW findings
specific to South African law (POPIA, the Consumer Protection Act, ECTA). This spec
covers the concrete fixes for those findings. It does not cover getting the documents
formally reviewed by a South African attorney, which remains a separate follow-up.

## Scope

Two independent pieces of work:

1. Text edits to three existing legal pages (Refund Policy, Terms of Service, Privacy
   Policy).
2. A signup consent gate in `AuthPage.jsx` to capture explicit consent to cross-border
   data transfer, since the Facebook/Google OAuth buttons currently create accounts
   without ever going through the password-signup form.

## 1. Refund Policy — cooling-off section

Add a new section, positioned before the existing "Refunds" section:

> **First-purchase cooling-off period**
> If you cancel within 7 days of your first Buddy Pro purchase, you'll receive a full
> refund, no questions asked, regardless of how much you used the Service during that
> time.

This applies **only to a customer's first-ever Buddy Pro purchase**, not to each
recurring renewal charge — otherwise the clock would reset every month and revenue
would be uncertain on every billing cycle. The existing "generally non-refundable"
language in the "Refunds" section remains, but now applies only *after* the 7-day
window has passed.

## 2. Terms of Service — liability savings clause

Add one sentence to the end of the existing "Disclaimers and limitation of liability"
section:

> Nothing in these Terms limits or excludes any liability that cannot be limited or
> excluded under South African law, including the Consumer Protection Act.

No other wording in that section changes.

## 3. Privacy Policy — three edits

- **Cross-border transfer**: add a sentence after the "Third parties we use" list
  explaining that transfers to providers outside South Africa (Groq, Google Cloud)
  occur under the user's consent (captured at signup — see part 4) and are subject to
  contractual safeguards requiring those providers to protect data to a standard
  consistent with South African law.
- **Retention**: replace "for as long as the account is active" with an explicit
  "...and for up to 30 days after a deletion request is processed" — this matches the
  existing Data Deletion Instructions page's 30-day commitment; no new number is
  introduced.
- **Information Officer & complaints**: add a line naming Byron@skillshouse.co.za as
  the Information Officer, plus a sentence noting the right to complain to South
  Africa's Information Regulator. Registration number and physical address are
  intentionally omitted with an inline `{/* TODO: add once Skillshouse is formally
  registered */}` comment — not fabricated, since Skillshouse's formal registration
  status is unconfirmed.
- **"We"/"us" consistency**: the Privacy Policy's opening sentence will name Skillshouse
  as the entity operating Buddy, matching how the Terms of Service already defines "we"/
  "us" as Skillshouse.

## 4. Signup consent gate (`AuthPage.jsx`)

The existing login/signup mode tabs don't cleanly gate OAuth: `handleGoogleLogin` and
`handleFacebookLogin` are the same handlers regardless of which tab is selected, and
Supabase can't tell the caller in advance whether an OAuth sign-in will create a new
account or log in an existing one. Gating by tab would let a new user who never
switches off the default "Log In" tab create an account via OAuth without ever seeing
a consent checkbox.

Instead, the gate is **per-device, not per-mode**:

- New state: `agreed`, initialized from
  `localStorage.getItem('buddy_terms_agreed') === 'true'`.
- A checkbox is rendered above the submit/OAuth buttons, only when `!agreed`:
  > I agree to the [Terms of Service](/terms) and [Privacy Policy](/privacy),
  > including transferring my data to service providers outside South Africa.
- `handle` (the password form submit handler), `handleGoogleLogin`, and
  `handleFacebookLogin` all check `agreed` first and short-circuit with an inline
  error (reusing the existing `error` state / `styles.error` display) if it's false,
  before making any Supabase call.
- Checking the box immediately sets `localStorage.buddy_terms_agreed = 'true'` and
  updates `agreed` to `true`, so the checkbox never reappears on that browser/device
  again — no added friction for returning users, and no need to distinguish new vs.
  returning OAuth users.

This is a client-side-only consent record (no new database column, no server-side
persistence). Acceptable for this fix because the underlying legal requirement is
capturing informed consent at the point of action, not proving it later — if
server-side proof of consent becomes a requirement, that would be a follow-up spec.

## Out of scope

- Getting these documents attorney-reviewed (separate follow-up, per the legal review
  output).
- Registered company number / physical business address (blocked on Skillshouse's
  formal registration status — left as a TODO, not invented).
- Any change to actual data flows to Groq/Google Cloud, or negotiating contractual
  safeguards with those vendors — this spec only adds the consent/disclosure text
  describing the existing setup.
- Server-side / database-backed consent records.
