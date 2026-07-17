# App Store Privacy "Nutrition Label" — answers for App Store Connect

DRAFT v0.1 · 2026-07-11 — matches the v1 local-first build (CONSTITUTION.md).
Fill these into App Store Connect → App Privacy. Re-answer if sync (v1.1),
analytics, or the AI backend changes the data flows.

## Top-level answer

**"Data Not Collected"** — with one conditional carve-out below.

Rationale: Apple's definition of "collect" = transmitted off the device in a
way that outlives the request. v1 has no accounts, no server DB, no analytics
SDKs, no ads. HealthKit data is read and processed on-device only. StoreKit
purchases are Apple's collection, not ours.

## The carve-out: consented AI processing

If the AI coach ships in v1 (M3 gate), survey text + daily performance
summaries are sent to Anthropic when the user consents. Declare:

| ASC field | Answer |
|---|---|
| Data type | "Other User Content" (survey answers, day summaries) |
| Linked to identity? | **No** (no account; requests carry no user identifier beyond what transport requires) |
| Used for tracking? | **No** |
| Purpose | App Functionality |

If the AI coach is deferred past launch (backend still paused), the label is
plain **Data Not Collected** — do not pre-declare.

## Per-category checklist (ASC questionnaire order)

- Contact info: **Not collected** (email exists only if the user emails us)
- Health & Fitness: **Not collected** (HealthKit stays on-device; still must
  declare HealthKit usage strings in Info.plist — see below)
- Financial info: **Not collected** (Apple handles payment)
- Location: **Not collected**
- Sensitive info: **Not collected** (recovery/faith module answers never leave
  the device except under the AI-consent carve-out above)
- Contacts / User content / Browsing / Search history: **Not collected**
  (accountability-partner names/numbers stay local; SMS goes through the
  user's own Messages app)
- Identifiers / Usage data / Diagnostics: **Not collected** (no analytics,
  no crash reporting in v1)

## Info.plist strings that must accompany this

- `NSHealthShareUsageDescription`: "Telemetry reads the sleep, activity, and
  heart-rate metrics you approve to show your trends and compute readiness.
  Health data never leaves your device."
- `NSHealthUpdateUsageDescription`: not requested in v1 (read-only) — omit
  write permission entirely.

## App Review notes (paste into the Review Notes field)

- Local-first: no account needed; reviewer can use the app immediately.
- Recovery content is an opt-in module, disclaimed as not medical care;
  crisis resources (988 / findahelpline.com) are linked in the help screen.
- AI consent flow names the provider (Anthropic) before any text is sent
  (guideline 5.1.2(i)).
