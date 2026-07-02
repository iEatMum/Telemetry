# BACKEND.md — wiring the backend, live data, and device APIs

Status as of 2026-06-20: **all code is written; nothing is deployed.** The web
app runs fully local-first without any of this. Each section below is a step
**you** run (this Mac has no Supabase/Deno CLI, and the Anthropic account is at
its monthly spend limit, so the AI calls can't run until that's raised). See also
`SHIPPING.md` for the iOS/App-Store path.

---

## 1. What's already built (code)

**Client (works today, no backend):**
- `src/lib/liveLayout.js` — builds the terminal deck from your real local store
  (streak, tasks/checklist, sprints, wellness, runs, income, engagement).
- `src/components/LiveDeck.jsx` — renders an **AI layout if one exists** (via
  `useLayout` → `ui_layouts`), otherwise the local live layout. App.jsx is now
  this deck + HELP NOW + Settings + the Sync & Refactor bar.
- `src/lib/architectClient.js` — calls the Architect; **fails soft** (no-op) with
  no backend/session, so it never blocks the app.

**Supabase (written, not deployed):**
- Migrations `0001`–`0006` (`supabase/migrations/`). `0006_generative_ui.sql`
  adds `user_profile`, `ui_layouts`, `ai_runs`.
- Edge functions: `architect` (NEW — survey/performance → AI layout), `counsel`,
  `referee`, `strava`.

---

## 2. Deploy the database

Run in the Supabase SQL editor, in order (each is idempotent):

```
0001_phase3_sync.sql   → 0002_checkpoints.sql → 0003_strava.sql
0004_wellness.sql      → 0005_push.sql        → 0006_generative_ui.sql
```

`0006` access model: `user_profile` is owner read/write (you write `survey`, the
function writes `research`); `ui_layouts` is **client-read / service-role-write**;
`ai_runs` is service-role-only.

---

## 3. Deploy the edge functions + secrets

```bash
# AI functions — keep JWT verification ON (only the signed-in user can call):
supabase functions deploy architect
supabase functions deploy counsel
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional model override (defaults to claude-opus-4-8):
supabase secrets set ARCHITECT_MODEL=claude-opus-4-8

# Webhook functions — JWT OFF (Shortcuts/Strava can't send a user JWT):
supabase functions deploy referee --no-verify-jwt
supabase functions deploy strava  --no-verify-jwt
supabase secrets set SHORTCUTS_WEBHOOK_SECRET=$(openssl rand -hex 24)
# optional SMS + Strava + push (see SHIPPING.md): TWILIO_*, STRAVA_*, VAPID_*
```

Client `.env.local` (already used by the app): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` (+ `VITE_VAPID_PUBLIC_KEY` for push).

---

## 4. The Architect loop (how live AI layouts happen)

1. Onboarding writes the user's answers to `user_profile.survey`, **including
   consent**: `survey.consent = { aiProcessing: true, provider: 'anthropic' }`.
   Without it the Architect returns `403` and sends nothing to Anthropic — this
   is the App-Store 5.1.2 gate (named provider + explicit consent).
2. First run: client calls `buildInitialLayout()` → Architect turns the survey
   into a `research` profile + an active `ui_layouts` row (validated against the
   widget allow-list; `InsightCard` text shame-screened).
3. Daily: "Finish day · Sync & Refactor" → `closeDay()` builds the Performance
   Payload → `requestRefactor(payload)` → Architect refactors tomorrow's deck
   (promote used widgets, demote ignored, adjust high-impact blocks).
4. `LiveDeck` adopts the active layout on next open (local deck is the fallback).

"Generate once" by default — the Architect reuses the active layout unless a
`performance` payload or `{regenerate:true}` is sent (cost control). Every run is
logged to `ai_runs`.

> ⚠️ Allow-list parity: `KNOWN_TYPES` in `architect/index.ts` **must** match
> `src/lib/registry.js`. Both currently list all 10 widgets (incl. EnergyTrendLine,
> MarketSentimentWidget, DailyBriefing). Add new widgets in both places.

---

## 5. Health data (HealthKit) — native, your device

Apple Health needs native code + a real device (no simulator) + the $99 program
for a distributable build. Wrapper: `src/lib/health.js` (fail-soft; no-op until
set up).

1. `npm i @perfood/capacitor-healthkit && npx cap sync ios`
2. Xcode → target → Signing & Capabilities → **+ HealthKit**.
3. `Info.plist`: `NSHealthShareUsageDescription` (+ `NSHealthUpdateUsageDescription`).
4. On device: `await requestHealthAuth()` once, then `readToday()` → `{steps,
   sleepHours, restingHR}`. `toReadinessInputs()` maps that to the readiness
   check-in (sleep 1–5 + RHR) for a future auto-fill (kept manual for now).

Alternative already wired: **Strava** (runs) via the `strava` function, and the
**manual readiness** check-in.

---

## 6. "Screen time" — via Apple Shortcuts, not the Screen Time API

Apple does **not** let an app read or upload raw Screen Time totals (Family
Controls / DeviceActivity is sandboxed by design). The realistic, already-built
path is event signals through the **referee** function:

- Create an **Automation** in the Shortcuts app, e.g. *When Bedtime/Downtime
  starts*, *When connected to charger after 10pm*, or *When an NFC tag is tapped*.
- Action: **Get Contents of URL** →
  - URL: `https://<project>.functions.supabase.co/referee`
  - Method: `POST`, Header `x-webhook-secret: <SHORTCUTS_WEBHOOK_SECRET>`
  - Body (JSON): `{ "userId": "<your-uuid>", "kind": "bedtime", "at": "<ISO time>" }`
- The referee adjudicates it against your `settings` targets (e.g. phone-down by
  22:15), logs an unalterable `checkpoints` row, and fires the Guardian Pulse /
  partner SMS on a miss. (No change to referee was needed — it already does this.)

So "phone down on time" is honest, verifiable accountability without ever reading
a Screen Time number.

---

## 7. Not done / next

- Onboarding survey UI that writes `user_profile.survey` (+ the consent toggle).
- Two-way deck actions (completing a task/checking the protocol *from* a widget
  writing back to the store) — the deck currently displays live data; mutation
  still flows through Settings/HELP NOW + the retained screen components.
- Auto-fill readiness from HealthKit (`toReadinessInputs` is ready; wiring is TBD).

---

## 8. Marketing waitlist (live at /?waitlist)

From the design-canvas handoff. Marketing surface ONLY — its `--m-*` theme
(`src/marketing-theme.css`) is scoped to this route and inert in the app; do NOT
port its red/amber or referral-rank mechanics into the app screens.
- `src/pages/Waitlist.jsx` — landing page (hero + email capture + a command-panel
  preview that shows the deal-in motion). Capture inserts into `waitlist` when the
  backend exists, else fails soft to a local mock.
- Run `supabase/migrations/0007_waitlist.sql` (anon-insert RLS + `waitlist_rank`
  view). Caveat: INSERT-only RLS means the client can't read `rank` back, so the
  page shows an approximate position — add a row-scoped SELECT policy or a
  SECURITY DEFINER RPC for a real rank.
- Referral link uses `?ref=<code>`; the page reads it on submit.

## 9. Terminal motion tokens ("Mechanical & Snappy")

Added to `src/index.css` (keyframes + `.animate-*` utilities), guarded by the
existing reduced-motion block:
- `data-stream` — staggered card deal-in (BlockRenderer staggers blocks by index).
- `pulse-live` — hard-edged live blink (MarketSentiment "LIVE" dot, waitlist NOW/LIVE).
- `flash-action` — 150ms tap confirm (DeepWorkTimer "Start").
- `typewriter` / `tw-caret` / `mark-breathe` / `breathe` (marketing clock) — available
  tokens for future use.
Note: the design system's brand cards (help-now/tabs/wordmark) describe the
PRE-PIVOT still-water look (gold, Morning/Examen/Offerings) and were intentionally
NOT applied — they'd undo the terminal redesign.
