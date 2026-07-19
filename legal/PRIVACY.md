# Telemetry — Privacy Policy (DRAFT v0.1 · 2026-07-11)

> DRAFT for review before App Store submission. Statements below describe the
> v1 local-first build ratified in CONSTITUTION.md (no accounts, no sync,
> StoreKit subscription). Re-review this document before shipping sync (v1.1)
> or enabling the AI backend.

**Telemetry — The Discipline Ledger** ("the app") is built by Ian Palsgaard
("we"). The short version: **your book stays on your device.**

## What we collect

**Nothing, by default.** Telemetry has no accounts, no sign-in, and no server
database in v1. Everything you enter — your schedule, streaks, urge records,
check-ins, survey answers, notes — is stored locally on your device and never
transmitted to us. We cannot see it, and we could not produce it if asked.

## Health data (Apple HealthKit)

If you choose to link Apple Health, the app reads only the metrics you approve
(sleep, activity, resting heart rate) to display your own trends and compute
your readiness locally. Health data:

- is processed **on your device only** and never leaves it;
- is **never** used for advertising, marketing, or sold/shared with anyone;
- can be unlinked at any time in Settings or the iOS Health app.

If you have separately consented to AI processing ("Connect Claude"), the
optional **AI health read** sends a one-day numeric snapshot of the metrics
you approved (numbers only — no names, notes, or identifiers) to our server,
which forwards it to our AI provider (Anthropic) solely to generate that
day's summary. It is not stored server-side and is never used to train
models. Decline or revoke AI consent and no health data ever leaves your
device.

## AI processing (optional, consent-gated)

Some coaching features (the daily briefing, weekly review, plan generation)
can use an AI provider — **Anthropic** — to generate text. This happens **only
if you explicitly consent** during onboarding or in Settings, and consent
names the provider before anything is sent. When enabled, the relevant text
(your survey answers and daily performance summary) is sent to Anthropic to
generate your coaching content, subject to Anthropic's commercial data terms
(inputs are not used to train their models). Decline or revoke consent and the
app's built-in rules generate this content locally instead — the app remains
fully functional.

## Purchases

Subscriptions are processed entirely by Apple through your Apple account. We
receive no payment details. Apple's receipt validation happens on-device.

## Analytics

v1 ships with **no third-party analytics SDKs, no ads, and no trackers**. If
we later add privacy-respecting product metrics, this policy and the App Store
privacy label will be updated first, and metrics will never include the
contents of your book.

## Crisis resources

The app links to the 988 Suicide & Crisis Lifeline (US) and findahelpline.com.
Tapping those uses your phone/browser directly; we receive nothing.

## Your data, your exit

Settings → Data lets you export everything as a file, or wipe the device copy
permanently. Because there is no server copy, a wipe is final and complete.

## Children

Telemetry is not directed at children under 13 and is rated accordingly.

## Changes & contact

Material changes will be shown in-app before they take effect.
Questions: ianpalsgaard@gmail.com
