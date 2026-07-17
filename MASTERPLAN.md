# TELEMETRY — MASTER PLAN (ratified 2026-07-17)
### Built from the three 10-judge tournaments (design 82.1 · functionality 79.7 · backend 77.1)
### CEO amendments folded in: design simplification + real art/animation emphasis · Guardian efficiency at low AI cost · pricing exploration · Apple $99 timing · Guardian notifications · app lockdown (Screen Time)

Reports this plan is built from: `reviews/DESIGN-TOURNAMENT-2026-07-16.md`,
`reviews/FUNCTIONALITY-TOURNAMENT-2026-07-16.md`, `reviews/BACKEND-TOURNAMENT-2026-07-17.md`,
plus the Opus dossier digest (diagnostics trusted, prescriptions re-judged).

---

## Phase 0 — Stop the bleeding (this week)

1. **Git remote.** Private GitHub repo, push everything (108 uncommitted files today; the whole
   product is one copy on one Mac). Needs Ian's GitHub auth — `gh` is not installed; either
   install GitHub CLI or create the repo on github.com and hand me the remote URL/SSH.
2. **Dump the paused Supabase project** before Supabase reaps it (waitlist emails + pre-pivot data).
3. **Fix the two day-2 killers (verified):**
   - `clearRefactor()` never called → "Rule off the day" permanently disabled after the first seal.
     Reset `refactorPending` at app-day rollover.
   - Heat-sheet posts never write the checklist slice → posted rows revert on reload. Wire
     ScheduleMatrix completions through the store.
4. **Guardian midnight math:** wrap `warnHour = peakHour − 0.5` mod 24 and roll to the correct day;
   re-arm daily (not only on band transitions).
5. **Import no longer deletes private handover drafts** (preserve device drafts on restore).
6. **Waitlist honesty:** the live page silently drops every signup while Supabase is paused —
   either point it at a working store or show the truth until the backend call works.

## Phase 1 — Ship-gates (before App Store submission)

**Store-build integrity**
- Env policy: production iOS build ships with `VITE_SUPABASE_*` EMPTY (keys are verifiably baked
  into the current bundle) and a build assertion that `VITE_TESTER` is unset.
- Gate `/?waitlist` and `/?onboarding` out of native/prod builds (like `?demo`).
- Disable the PWA service worker in Capacitor builds (SHIPPING.md prescribes it; vite.config lacks it).

**The book survives**
- Automatic snapshot of `exportAll()` to the app sandbox via `@capacitor/filesystem` (on pause +
  day rollover, keep last 3; offer restore on empty boot). localStorage alone is evictable.
- Quota-full and corrupt-slice failures surface a banner + quarantine copy (never silent loss).
- Wipe cancels all pending native notifications before deleting their id sidecar.

**Crisis path (safety-critical)**
- Urge protocol persists state across process death; re-entry resumes the ride.
- "Can't do this one" skip on protocol steps; verse step shows the verse.
- HELP gets its own glyph + a landing frame (not straight into a running timer); nav active-state fix.
- 9px night-page type to the 11px floor; real `tel:988` / `sms:988` stay.

**Platform & a11y**
- Dynamic Type px→rem sweep (216 literals) + AX reflow for heat sheet/KPIs; wire the native
  UIContentSizeCategory dispatcher.
- `@capacitor/status-bar` per skin; `@capacitor/keyboard` + sheet inset handling; portrait lock;
  drop the fake in-app clock/signal bars on native.
- Focus containment behind sheets; lane-red + muted-on-surface-2 contrast fixes; tab-strip
  selection semantics; TourSheet dialog manners.

**Correctness sweep (from the functionality bench)**
- Unify day rollover: tasks/sprints tiles on appDayKey (3am) everywhere.
- Forge double-count fix; DeepWork timer completes its own impact + feeds the weekly target;
  EWMA folds AFTER assessment; boot probe + onboarding finish get timeouts; widget daysOnBook dep;
  onboarding progress persists across kill.
- Trial detection + billing-grace-period handling in purchases.js; restore-error copy honesty;
  subscription-manage row in Settings; stale milestone banner expires.
- Tests: engagement.js + notifications.js unit coverage; one E2E driving the real production funnel
  (/ → onboarding → deck → seal → reload), one time-travel spec across the 3am boundary.

**Voice sweep** — EXEC counter, Guardian/Command cockpit words, "HEALTH surface", onboarding
"aggressive protocol"/"NOTHING SHIPPED", double CoachGate collapse, dictation contradiction
(derived rows labeled as derived, or removed).

## Phase 2 — DESIGN: simplify + real art + animation (CEO emphasis; parallel with Phase 1)

**Mandate for Claude Design round 2 (via DesignSync):**
0. First push the CURRENT Split Ledger tokens + shipped components to the claude.ai project
   (it is still terminal-era) so design happens against truth.
1. **SIMPLIFY** — fewer instruments, one voice: single label primitive (kill the 3-way fork),
   dedupe the record (hero vs Pulse vs Guardian print the same numbers once each), exactly one
   focal point per screen, progressive disclosure day-0 → day-7 (already started with the
   brand-new minimal deck — extend the principle everywhere).
2. **REAL GRAPHIC ART** — commissioned assets, not CSS boxes:
   - Layered iOS-26 app icon (manila ground · carbon ring · lane-red seal; dark + tinted variants)
   - The ◆ wax-seal ceremony ring (216px, press-sweep → stamp → settle)
   - Tour illustrations (6 pages are currently text-only "tell")
   - Day-0 empty-book illustration; milestone share-card art
   - App Store: 6-shot designed frame system + 15–20s seal-ceremony preview video
3. **ANIMATION (sanctioned set, reduced-motion fallbacks everywhere):**
   - Seal ceremony (the hero interaction; commit-hold visually distinct from slip-hold)
   - Sheet entrance/exit — "a page pulled from the book" (they currently teleport)
   - rule-draw on the tab underline; page-turn between Today/Trends
   - Wire `haptic-beat` + `selectionTick` (currently dead code) to their moments
   - Pressed states on all primary targets

## Phase 3 — GUARDIAN PROGRAM (CEO emphasis)

**3a. Efficient + good at its job, low data cost:**
- Layer 0 (on-device, $0): the rules engine stays local and gets the correctness fixes (Phase 0/1).
  This layer alone must be genuinely useful — the AI is seasoning, not the meal.
- Layer 1 (cheap AI): counsel margin notes on **Haiku 4.5**, fired only on pattern TRANSITIONS,
  cached per (pattern, app-day), hard cap ~2/day/user. ≈ $0.08/user/mo.
- Layer 2 (rich AI): nightly deck refactor on **Sonnet via the Message Batches API** (50% discount,
  fixes the impossible 500-sequential-Opus loop) + prompt caching; skip users with no engagement
  that day; Opus reserved for the weekly review at most. Target ≈ $0.25–0.35/user/mo.
- Rails: server-side entitlement check on every AI endpoint, per-user daily caps, `ai_runs` row on
  EVERY call, global spend kill switch, consent gate on counsel (currently missing), shame-screen
  ALL model-authored text (not just InsightCard), de-Ian the guardianPersona.
- **Blended AI cost target: < $0.40/user/mo** → healthy even at the annual tier's ~$2.83/mo net.

**3b. Notifications that actually deliver:**
- Fix arming (daily, not band-transition) + midnight wrap (Phase 0) — then device-verify delivery.
- Permission priming screen before the raw iOS prompt; a recovery path when denied.
- Lock-screen privacy: generic titles for user-authored blocks + danger-window warnings
  (recovery context; nothing sensitive on a visible lock screen).
- v1 is LOCAL notifications only (works without any backend). APNs is v1.1; delete the dead
  Web-Push/VAPID stack (wrong transport for native iOS).

**3c. APP LOCKDOWN (new flagship: shield apps in the danger window):**
- iOS stack: FamilyControls + ManagedSettings + DeviceActivity ("Screen Time API").
  User picks apps via FamilyActivityPicker (opaque tokens — we never learn which apps: privacy-
  perfect for this product); we shield them on the DeviceActivitySchedule matching the user's
  danger window / focus blocks. Proven App-Store-viable (Opal, one sec, Jomo).
- Requirements: paid Apple Developer account → then **immediately request the Family Controls
  distribution entitlement from Apple (longest lead time in the plan — days to weeks)**; custom
  native Swift module + Capacitor bridge; SwiftUI picker.
- Psychology spine: lockdown is USER-AUTHORED armor ("I shield these apps during my window"),
  never a punishment; unlock always possible via the night page (an urge outlasted with the shield
  up is a win; a bypass is data, not shame).
- Ship in v1 if the entitlement lands in time; else first update. Build starts as soon as the
  membership is active.

## Phase 4 — PRICING (explore before creating ASC products)

- Current: $6.99/mo · $39.99/yr (annual nets ~$2.83/mo after the 15% small-business cut).
- The blocking-app competitive set prices HIGHER (Opal ~$99/yr; one sec/Jomo ~$40–60/yr;
  Fabulous ~$80/yr). With app lockdown + Guardian, exploring $7.99/mo · $49.99/yr is justified;
  trial length A/B (7 vs 14 days) is one token (`TRIAL_DAYS`).
- Sequence: Guardian cost model (3a) → competitive scan → price decision → THEN create the ASC
  subscription group. Pricing decision gates submit-ledger step 1, not the $99 purchase.

## Phase 5 — Apple logistics ($99: BUY NOW)

Buy the Apple Developer Program membership **immediately**, because it gates four clocks:
1. **Family Controls entitlement request** (longest external lead time — file the day the
   membership activates).
2. Widget on device (App Group `group.com.ianpalsgaard.telemetry` needs a paid team).
3. StoreKit device verification against real ASC products + TestFlight builds.
4. Enrollment itself takes ~24–48h to activate (D-U-N-S not needed for individual).
What stays possible free: Xcode sideload of the core app (7-day re-sign), local notifications,
StoreKit *local* testing via a .storekit configuration file. Everything else waits on the $99.

## Phase 6 — v1.1 backend resume (post-launch; unchanged from draft + tournament findings)

Migration 0012 (CHECK constraints → split_book/lamplight/carbon + witness) · waitlist_rank
security-invoker fix + rate-limited join RPC · tombstones · paginated delta pulls ·
(user_id,id) composite PKs · epoch-ms LWW + server clock clamp · uid-bound book + claim ceremony ·
account deletion + server-side export (GDPR) · APNs · survey redaction before any AI call ·
retire stakes/strava surfaces · RESUME.md runbook.

---

## Decision log (2026-07-17)
- Plan ratified by Ian with amendments: design simplification + real art/animation elevated to a
  launch emphasis; Guardian efficiency/cost program; pricing exploration before ASC; $99 now;
  Guardian notifications hardened; app lockdown added as flagship.
- OPEN: GitHub remote needs Ian's auth (gh not installed). Pricing decision pending 3a cost model
  + competitive scan. Family Controls entitlement timeline unknown until requested.
