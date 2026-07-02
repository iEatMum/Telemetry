# Telemetry — Deploy Checklist (Phases A–E)

Everything in Phases A–E is **code-complete and verified** (57/57 tests, clean build). Nothing below could be done from the dev environment — it's all your account/device/portal work. This is the single ordered list; deep detail lives in **`SHIPPING.md`** (iOS) and **`BACKEND.md`** (Supabase).

Constants used throughout (verified): bundle id `com.ianpalsgaard.telemetry` · URL scheme `telemetry://` · App Group `group.com.ianpalsgaard.telemetry`.

---

## Which phase needs what (quick map)

| Phase | To activate it, you need… | Blocked on |
|---|---|---|
| **A** native config | HealthKit + App Groups capabilities enabled in the Apple portal; `telemetry://auth-callback` in the Supabase redirect allowlist | Xcode + portal |
| **B** Health | A's HealthKit capability + a **real-device** build (no simulator) | §2 + §3 |
| **C** widget | A's App Group + a **widget-extension target** built with the 4 written files | §2 + §3 |
| **D** push | **Nothing** — local notifications need only the runtime permission prompt. APNs deferred. | — |
| **E** AI Counsel | `counsel` fn deployed + `ANTHROPIC_API_KEY` set + `referee` producing `checkpoints` | §1 |

---

## 1. Supabase backend (one-time, no Mac needed)

Activates Phase E **and** the whole signed-in app (auth, sync, architect). Do this first.

- [ ] **Run migrations in order** in the Supabase SQL editor: `0001_phase3_sync` → `0002_checkpoints` → `0003_strava` → `0004_wellness` → `0005_push` → `0006_generative_ui` → `0007_waitlist` → `0008_profile_preferences` → `0009_stakes_history`. (Phase E specifically needs **0002**.)
- [ ] **Enable Email auth** (magic link) in Auth → Providers.
- [ ] **Add redirect URLs** (Auth → URL Configuration): `telemetry://auth-callback` (native login — Phase A) **plus** your web origins (`http://localhost:5173`, the Vercel prod URL). Without the `telemetry://` entry, native magic-link login silently falls back to the Site URL and never returns to the app. Magic-link email-template specifics: `SHIPPING.md` §3.
- [ ] **Set function secrets** (`supabase secrets set NAME=…`). Do **not** set `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — the edge runtime injects those.
  - [ ] `ANTHROPIC_API_KEY` — **required for Phase E** (`counsel`) and `architect`. Optional overrides: `COUNSEL_MODEL`, `ARCHITECT_MODEL` (both default `claude-opus-4-8`).
  - [ ] `SHORTCUTS_WEBHOOK_SECRET` — required for `referee` (the Apple Shortcut sends it as `x-webhook-secret`).
  - [ ] `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_VERIFY_TOKEN` — only if wiring Strava run verification.
  - [ ] *(optional)* `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` — partner SMS from `referee`; without them it logs instead of texting.
  - [ ] *(optional, web-only)* `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — Web Push for the PWA. **Skip for the iOS launch** (dead in WKWebView; Phase D deferred native APNs).
- [ ] **Deploy functions:**
  - [ ] JWT-verified (client-called): `supabase functions deploy counsel architect stakes`
  - [ ] Webhook (external caller, no user JWT): `supabase functions deploy referee strava --no-verify-jwt`
- [ ] **Client env** (`.env.local` for dev, Vercel env for prod, then redeploy the web build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The client fails soft to local-only without these, so `invokeCounsel` (Phase E) can't reach the function until they're set.

**Phase E end-to-end** additionally needs `checkpoints` rows to exist — deploy `referee` (above), set `SHORTCUTS_WEBHOOK_SECRET`, and build the Apple Shortcut that POSTs wake/bedtime telemetry (recipe in `BACKEND.md` / the `referee` README). Until checkpoints exist, the Counsel card shows its engagement fallback — that's expected, not a bug.

---

## 2. Apple Developer portal (one-time, needs the $99 program for device/TestFlight)

On App ID `com.ianpalsgaard.telemetry`:

- [ ] Enable the **HealthKit** capability (Phase B).
- [ ] Enable the **App Groups** capability and **register the group** `group.com.ianpalsgaard.telemetry` (Phases A + C).
- [ ] Signing is Automatic (team `8SL678DDFB`) — Xcode provisions these once they exist in the portal.

---

## 3. Xcode, on the Mac (device build)

- [ ] **One-time first-launch component install** (admin password): open Xcode.app once, or `sudo xcodebuild -runFirstLaunch`. This is the standing blocker to *any* device build (`CoreSimulator` absent).
- [ ] **Create the widget target** (Phase C): open `ios/App/App.xcodeproj` → File ▸ New ▸ Target ▸ **Widget Extension**, name it `TelemetryWidget`; uncheck "Include Live Activity" + "Include Configuration App Intent"; Embed in App. Then **overwrite** Xcode's generated `TelemetryWidget.swift` + `Info.plist` with the files in `ios/App/TelemetryWidget/` and **add `SharedStore.swift`** to the target (confirm both `.swift` files show Target Membership = TelemetryWidget).
- [ ] **Widget App Group + gotcha:** on the TelemetryWidget target, Signing & Capabilities ▸ + App Groups ▸ check `group.com.ianpalsgaard.telemetry`. ⚠️ Keep `CapgoWidgetKitAppGroup = group.com.ianpalsgaard.telemetry` in the widget's Info.plist (the written one has it) — without it the plugin reads the wrong suite and the widget shows zeros.
- [ ] **Build to a real device** (Phases B + C need real hardware — HealthKit and widgets don't run in the Simulator). Free Personal Team is fine to smoke-test; the $99 program is needed for TestFlight / App Store / App Groups on a distributable build.
- [ ] **On first run:** grant the notification permission prompt (Phase D) and the Health authorization sheet (Phase B), then add the Daily Briefing widget from the home-screen gallery (Phase C).

---

## 4. Phase D — nothing to deploy

Local notifications (`@capacitor/local-notifications`) need only the runtime permission prompt, which fires on first launch. Notifications are daily-repeating. Native remote push (APNs) was deliberately deferred — revisit post-launch if you want the Guardian's Pulse / re-engagement on device.

---

## Can't be verified without this deploy

Health reads, the home-screen widget, native deep-link login, and AI Counsel all depend on a real-device build and/or the deployed backend. Everything is wired and format-/build-verified, but their live behavior is unexercised until the steps above are done.
