# CONSTITUTION.md — Telemetry product constitution + ship plan

Ratified 2026-07-11 (M0 · Decision Day). This is the page every later argument
defers to. Change it only with a dated amendment at the bottom — never silently.

---

## The four decisions

### 1 · Business model — local-first, subscription
- **No accounts in v1.** The magic-link door is removed; Supabase stays paused.
  All data lives on-device (localStorage → native persistence via Capacitor).
- **StoreKit 2 subscription.** No backend required for entitlements.
- **Free forever (the book):** heat sheet, schedule posting, streaks/run,
  sprints, night page / urge protocol, settings, all three skins.
  *The habit loop and every safety feature are never paywalled.*
- **Paid (the coach):** AI daily briefing, Guardian drift intelligence,
  weekly review, protocol forge, danger-window coaching.
  Pitch: **"Your book is yours. The coach is hired."**
- Sync returns in v1.1 as a paid perk, not a launch requirement.

### 2 · Price
- **$6.99/month · $39.99/year**, 1-week free trial on both.
- Annual is the pushed default — "a year on the book" ($3.33/mo effective).
- AI unit-economics rule: **one cached briefing per day, one weekly review**
  per user. Any new AI surface must state its per-user monthly token cost
  before it ships.

### 3 · Identity
- Name: **Telemetry**. App Store subtitle: **"The Discipline Ledger"**.
- Brand = the Split Ledger design system (manila paper, carbon ink, lane-red
  reserved for commitment). Screenshots and ads lead with the paper book —
  we are the analog object in a scroll of black-glass dashboards.
- Voice: the tape, not the judge. Nothing shouts. Misses are ink withheld,
  never red.

### 4 · Sensitive-module framing — quiet opt-in
- Marketed purely as a **discipline/execution** app. Recovery + faith remain
  survey-gated opt-in modules: never in ASO, screenshots, or ad copy.
- The **988 crisis link ships in HELP NOW regardless** of module state.
- Standing disclaimer wherever recovery content renders: not medical care,
  not a treatment program.

---

## The ladder (Plan C — every milestone is a shippable state)

Work order within a milestone = walk order through the app. One finish-line
at a time; a milestone is DONE when its checklist is empty and the suite is
green. Do not pull M(n+1) work forward.

### M1 · SAFE — can't hurt anyone, can't get rejected  (7) — ✅ DONE 2026-07-11
- [x] 988 crisis resource inside HELP NOW / night page (+ findahelpline.com
      non-US fallback) — UrgeProtocol.jsx, tel:988 link verified in-browser
- [x] Privacy policy + App Privacy labels drafted — legal/PRIVACY.md,
      legal/TERMS.md, legal/APP-PRIVACY-LABELS.md (incl. HealthKit Info.plist
      strings + 5.1.2 AI-consent review notes)
- [x] React error boundary around the app shell — components/ErrorBoundary.jsx
      wraps Root in main.jsx ("Reopen the book"; built + wired, not live-fired)
- [x] `?demo` bypass gated on `import.meta.env.DEV` (0 "demo" strings in the
      prod bundle — verified); TEMP Deck.jsx / LayoutDemo.jsx deleted
- [x] aria-labels — heat-sheet rows carry block/time/impact/state names, timer
      clock labeled; browser sweep of all 5 surfaces: 0 unnamed controls
- [x] Day-0 / no-data modes — briefing "Nothing on the book yet", Guardian
      "first day on the book" + "deck dealt — no reads yet" (no red dots on a
      fresh install), Internal Markets omitted until real signal exists,
      mid-day pending ≠ missed, ignored only judged on a sealed day
- [x] "HOLD TO SURRENDER" → "Hold to log the slip" (hold friction kept)

### M2 · WHOLE — one brand everywhere  (6) — ✅ DONE 2026-07-11
- [x] Onboarding reskinned to Split Ledger ("opening your book": manila page,
      ink progress rule, current-line selection, ink NEXT / lane-red seal on
      INITIALIZE) **plus** funnel reorder: first run → onboarding → deck;
      AuthGate/Login/nativeAuth deleted (per M0.1)
- [x] Trends de-perps: MarketSentimentWidget deleted (registry, defaultLayout,
      architect KNOWN_TYPES synced); TRENDS = Counsel margin note → signals →
      "The week's balance" WeekGrid → lifetime → faith card (opt-in)
- [x] Sprint restructured: ruled header, current-line preset selection, ink
      target marks + week bars, lane-red on Start/Resume only, ink numerals
- [x] Command: "Split Book" / "not set yet" / "Your book · every entry stays
      on this device" — no raw keys, no dev diagnostics
- [x] HELP docked as the nav's sixth slot (floating pill deleted — can never
      overlap content); accessible name "Help now" kept for the crisis path
- [x] Accent sweep: settings section headers, weekly-review notes/stats,
      sprint dots/bars, FOCUS ◆ (died with the widget); accent = seal/Start/◆/
      HELP/active-tab only
- [x] Ride-along: MIND folded into TRENDS; legacy screens deleted (Morning,
      Examen, Offerings, Streak, Money, Train, TabBar, Login, AuthGate,
      RecordLedger, HandoverComposer, Counsel, nativeAuth); WellnessSheet
      KEPT and wired into HealthPanel (it was the app's only readiness input
      and had lost its door)

### M3 · SELLABLE — the register opens  (4) — ✅ DONE 2026-07-11 (client side)
- [x] StoreKit 2 via @capgo/native-purchases behind src/lib/purchases.js
      (lazy native import, DEV mock register on web, ios-only refusal on web
      prod; entitlement sidecar lockedin:__coach — a cache of Apple's truth,
      never synced/exported). Gates: Guardian sentinel + protocol intelligence,
      Sunday Debrief, Counsel margin notes → CoachGate locked cards; The
      Record, urge protocol, briefing, export all stay free ("the tape is
      free; the reading of the tape is the coach").
      ⚠ NATIVE PATH NEEDS DEVICE VERIFICATION + Ian's ASC setup: subscription
      group "Coach", products telemetry.coach.yearly ($39.99) /
      telemetry.coach.monthly ($6.99), 7-day intro trial on both.
- [x] Paywall.jsx in ledger voice ("Your book is yours. The coach is hired."),
      annual pushed, opened only from CoachGate taps (never at launch),
      restore line + Apple fine print; dev-mock purchase walks the whole flow
- [x] src/lib/analytics.js — counts only, on-device only (lockedin:__metrics,
      keeps the "Data Not Collected" label): onboarding per-node +
      complete, daily opens, local d1/d7 retention (null = unknowable),
      paywall_view → trial_start funnel
- [x] Undo on posted rows: tap toggles back (engagement uncompleteImpact;
      refused after the day is sealed), VoiceOver labels flip post/undo

### M4 · MARKETABLE — the funnel exists  (5) — ✅ DONE 2026-07-11 (client side)
- [x] Share card — src/lib/shareCard.js: canvas-drawn 1080×1920 story cards in
      the ACTIVE skin's tokens (book hero + Sunday week's balance), native
      share sheet w/ download fallback, counts on the private tally. Quiet
      "Share" affordances on the BookHeader and the WeekGrid header.
- [x] Home-screen widget — JS bridge complete (lib/widgets.js →
      @capgo/capacitor-widget-kit, synced from App on every briefing change);
      native files exist (ios/App/TelemetryWidget/). ⚠ Ian's Xcode step:
      add the widget-extension target + App Group, per SHIPPING.md.
- [x] Danger-window notification — already built and wired: guardianEngine.
      scheduleGuardianWarning fires ONE voiced+screened local notification per
      day at warnAt (danger-window peak − 30min, survey-seeded from day 0),
      plus notifications.js schedules daily block reminders from the resolved
      layout. ⚠ Native-only — needs device verification.
- [x] App Store listing pack — marketing/ASO.md: name/subtitle within char
      limits, 97-char keyword field, category/rating answers, description
      lead, promo text, and the 6-shot screenshot list with captions +
      Simulator capture/seeding instructions. ⚠ Ian captures the actual
      screenshots on the Simulator; privacy policy must be hosted first.
- [x] Waitlist points at the store — APP_STORE_URL constant (store button
      leads once filled); pre-launch line is honest ("launching on the App
      Store — the list gets it first"); the fabricated "8,423 on the list"
      social-proof count removed.
- → **Submit** — remaining steps are all Ian's (see the ledger below).

## The submit ledger (everything left is manual / Apple-side)

1. App Store Connect: create the app, subscription group "Coach" +
   telemetry.coach.yearly ($39.99) / telemetry.coach.monthly ($6.99), 7-day
   intro trial on both (M3 ⚠).
2. Xcode: `npx cap sync ios`, add the TelemetryWidget extension target + App
   Group (M4 ⚠), build to the phone.
3. Device verification: StoreKit purchase/restore, danger-window notification,
   HealthKit link, widget rendering. **Runbook: `DEVICE_VERIFICATION.md`** —
   the JS + native seams are API-verified against the installed plugins; the doc
   walks every path on device (incl. the A2 entitlement cases: trial label,
   restore-doesn't-grant-free, no-revoke-on-transient, winback on expiry, refund).
4. Host legal/PRIVACY.md + TERMS.md (Vercel); paste URLs into ASC; fill the
   privacy labels from legal/APP-PRIVACY-LABELS.md.
5. Capture the 6 screenshots per marketing/ASO.md on the Simulator.
6. Fill APP_STORE_URL in Waitlist.jsx once the listing exists; deploy.
7. Submit for review (review notes in legal/APP-PRIVACY-LABELS.md).

---

## Coverage ledger (all 24 review concerns → a home)

| Concern | Home |
|---|---|
| Crisis resource / 988 | M1 |
| Privacy policy + App Privacy labels | M1 |
| HealthKit disclosure | M1 |
| AI consent/disclosure | M1 |
| Accessibility (unnamed buttons) | M1 |
| Terms of service | M1 (with privacy policy) |
| Error boundary | M1 |
| `?demo` bypass + TEMP files | M1 |
| Day-0 punitive states | M1 |
| "Surrender" wording | M1 |
| Onboarding reskin | M2 |
| First-run funnel / email door | M0 decision → built in M2 |
| Trends perps-era card | M2 |
| Sprint restructure | M2 |
| Command raw internals | M2 |
| HELP NOW collision | M2 |
| Accent-grammar violations | M2 |
| MIND tab thinness / legacy screens | M2 ride-along |
| Monetization + paywall | M0 decision → built in M3 |
| Analytics | M3 |
| Undo on posted rows | M3 |
| Share card | M4 |
| Widget | M4 |
| Danger-window notification | M4 |
| ASO name/subtitle/screenshots/waitlist | M0 decision → built in M4 |

## Amendments

### A1 · 2026-07-11 — Second review panel sweep (post-ladder)
A second judge panel (appointed by the first: App Review veteran, accessibility
specialist, crisis counselor, growth creator, subscription operator) re-walked
the finished app. All confirmed findings were fixed the same day:

1. **Stakes honesty (blocker).** Onboarding's final node offered a $50 Stripe
   pledge and an auto-ping "Social" witness — neither exists in local-first v1
   (triggerStakesCheck silently no-ops). Node rebuilt as "Your corner":
   **A witness** (name+phone → becomes a real settings.partners entry, feeding
   the night page's one-tap text) or **Just me**. No option promises anything
   the app can't perform. stakes.js survives only as a documented v1.1 seam.
2. **Legal in-app (3.1.2, blocker).** legal/PRIVACY.md + TERMS.md now bundle
   into the binary (LegalSheet.jsx via ?raw) and are linked from the paywall
   fine print AND a Settings "fine print" section. Hosting them (submit ledger
   step 4) remains required for the App Store metadata URL only.
3. **Localized prices (blocker).** getLocalizedPlans() overlays StoreKit's
   storefront price strings; hardcoded USD is only the off-native fallback.
   ⚠ Needs device verification with real ASC products.
4. **Settings ghost sweep.** Monthly goal / Report to college / Shoes(Train)
   removed; "Syncs across your devices" → "Set per device"; MIND → Trends.
5. **Dead targets off the deck.** Income/mileage rows (defaults $3,500 / 35mi
   nobody chose, streams with no remaining input) removed from liveLayout and
   defaultLayout; the Targets block renders only when a real item exists.
6. **Crisis line keeps its post.** Slip confirmation renamed "Logged · the
   book stays open" (person-first at the highest-risk moment) and the 988 +
   findahelpline line now renders on that screen too.
7. **--faint AA amendment.** All five skin blocks' --faint moved to ≥4.5:1
   against their --bg (was 2.5–3.2) — the one token edit to the champion
   palette, dated in index.css. Share buttons got 44px hit areas.
   (Accent-on-bg micro-labels sit at 3.9–4.2:1 and stay: darkening --accent
   per-skin would break the seal grammar; logged as a known AA-large tradeoff.)
8. **Share moments.** Hero Share hidden on an empty book; MilestoneShareCard
   offers the story card once per milestone (7/30/100/365; sidecar
   lockedin:__share_milestones, never synced/exported).
9. **"I stayed" arms at 60s** (3s DEV) — the outlasted pile can't be inflated
   by a drive-by tap; the ✕ escape still logs nothing.
10. **Honest status + honest count.** No-backend builds show "ON DEVICE"
    (calm-pos, never warn); onboarding's step total shrinks with the walked
    branch (13/13, not 13/15); Google Fit removed (iOS-only v1); paywall
    carries a lapsed/winback state ('expired' status — ⚠ written only by the
    native entitlement refresh at device-verification time, plus a DEV helper).

Suite after sweep: 235 unit + 12 E2E green; prod bundle contains zero ghost
strings (Stripe/college/income/Google Fit/pinged/syncs — verified by grep).

**A1 review round (same night).** A multi-lens adversarial review ran over the
sweep diff; the accessibility and test-coverage lenses completed (the other
three died on the session's usage limit — re-run them if paranoia strikes) and
their confirmed findings were fixed:
- **Hold-to-log-the-slip is no longer pointer-only** (was a WCAG 2.1.1 Level A
  failure on the app's most important screen): keyboard users hold Space/Enter
  for the same 1.2s (early keyup cancels free), and screen-reader/synthetic
  activations walk a two-step confirm ("Tap again to log it", 4s window,
  aria-live). Friction preserved; nobody locked out. Verified: both paths log,
  early release + expired confirm log nothing.
- **LegalSheet is a real dialog** — role=dialog/aria-modal, focus lands on
  Close, Escape dismisses, 44px close target (Paywall + night-page ✕ got the
  44px treatment too).
- "I stayed" unarmed state has a **stable accessible name** ("unlocks after
  the first minute") so the ticking countdown doesn't re-announce every
  second, plus a status announcement the moment it arms.
- MilestoneShareCard: 44px actions, card moved to bg-surface so muted text
  holds AA on its own ground. InsightCard's source tag (the live/counsel
  honesty marker) faint→muted; all input placeholders faint→muted.
- Witness fields got persistent visible labels + an explicit "Initialize
  unlocks when both the name and the number are down" status line.
- **Six new E2E contracts** (tests/sweep.spec.js + additions): witness →
  settings.partners write-through, milestone asks-exactly-once + no Share on
  an empty book, lapsed winback paywall (and no false trial promise), legal
  docs open from Settings AND over the paywall, ✕ escape logs nothing, crisis
  line on the ACTIVE ride, arm-gate disabled state, honest counter 01/15→12/12.
  Unit: corrupt-sidecar test now actually exercises the parse (via restore()),
  Targets-omission pinned. **238 unit + 18 E2E green, build clean.**
- Known accepted gaps (documented, not fixed): ON DEVICE status is untestable
  under the E2E harness (stub Supabase env always configured — needs a second
  webServer without it); getLocalizedPlans' native product-shape handling is
  unit-unmocked and proves itself at device verification (submit ledger 3).

**A1 review round 2 (the 3 lenses that died on the usage limit — correctness,
app-review, design-grammar — re-run clean on opus-4-8 + full adversarial
verify).** 7 findings, 3 survived a 3-judge refute pass (4 refuted: the
DailyBriefing "AI" tag and the consent over-disclosure copy — both judged
protective/non-blocking; the counsel consent-gate — unreachable with the
backend paused). Fixed:
- **BLOCKER — restore() gave away the paid coach.** The native branch wrote
  status:'active' unconditionally after restorePurchases() resolved, but
  StoreKit resolves that call even when NOTHING is owned — so any user tapping
  the mandatory "Restore Purchases" button unlocked Guardian/review/counsel for
  free (App Store 3.1.1 rejection + our own register defeated). Now restore()
  reads real ownership via getPurchases({onlyCurrentEntitlements:true}), grants
  only when a coach productIdentifier is genuinely owned + unexpired, corrects a
  stale sidecar otherwise, and REFUSES if the plugin can't answer. New
  purchases.native.test.js mocks Capacitor+plugin to pin all five paths (the
  native branch node/vitest otherwise can't reach). ⚠ still device-verified.
- **MEDIUM — sticky witness recommendation.** recommendSocial was a one-way
  latch: pick "I stop looking" (ghost), go BACK, change your answer, and the
  stakes step still showed a "suggested" witness + the false first-person note
  "you said you go dark after a miss" — a lie in the ledger voice. Fixed with
  defaultSet:{recommendSocial:false} on the slipResponse node so any non-ghost
  answer clears it. Browser-verified both directions.
- **LOW — "0:60" clock.** Prod STAY_ARM_SECONDS=60 rendered "Ride it — closes
  in 0:60" (a non-existent time) on the night page's first frame. Now formats
  as real m:ss via armCountdown() → "1:00". (DEV's 3s hid it, which is why the
  walk missed it.)
- **245 unit + 18 E2E green, build clean.** The two review rounds together
  spent ~2.1M subagent tokens across 83 agents; every confirmed finding fixed,
  every refutation trusted.

---

**A2 — the full ten-agent board re-review (5 judges + their 5 appointees), run
over the shipped post-ladder app.** The panel returned complete, code-grounded
reviews; the automated adversarial-verify fan-out could not run on this machine
(100+ concurrent agents stalled twice), so triage + verification were done by
hand against the actual source. 17 findings confirmed against code and fixed
(the user opted into the full set):

- **Monetization seam (purchases.js + App.jsx).** The entitlement was a local
  cache refreshed ONLY on a Paywall tap, so a cancelled/expired sub kept the
  coach free forever AND the winback page was dead code (nothing wrote
  'expired' in prod). Added `refreshEntitlement()` — a silent StoreKit
  currentEntitlements read on launch + every foreground return — that writes the
  true status (active/trial/expired/none), making the winback reachable and the
  trial-vs-paid distinction real. Also fixed `restore()` over-correcting: a
  transient getPurchases() failure was indistinguishable from "owns nothing" and
  REVOKED a paying subscriber; now `readOwnership()` returns checked/!checked and
  restore leaves the sidecar intact on a verify failure. 4 new native tests. ⚠
  device-verified.
- **Paywall honesty (Paywall/widgets/Onboarding).** Two of the four paywall
  bullets sold things the FREE book already gives — the DailyBriefing (ungated)
  and the Guardian danger notification (fires for all users). Reworded all four
  to sell only genuinely-gated coach surfaces (the reasoning, the margin note,
  the Sunday review, the re-deal). Relabeled the "AI" badge on locally-composed
  briefing text → "READ" (no server model in v1). Reconciled the onboarding
  consent copy with v1 reality (nothing is sent; backend paused) so it no longer
  contradicts the "Data Not Collected" privacy label, and dropped the
  user-facing guideline-5.1.2 citation. Added an explicit 3.1.2 auto-renew
  disclosure keyed to the selected plan.
- **Accessibility + crisis.** Removed `maximum-scale=1.0` (pinch-zoom was
  impossible — WCAG 1.4.4). Gave Paywall, Sheet (Settings/Confirm/Wellness), and
  the UrgeProtocol Shell real dialog semantics via a shared `useModalDismiss`
  hook — role=dialog + aria-modal + focus-on-open + a LIFO Escape stack so
  Escape closes only the TOP dialog. Paywall's Restore/Privacy/Terms links moved
  to their own 44px-tall row. Split "Call or text 988" into a real `tel:988`
  AND `sms:988` (texting was impossible); added the crisis line to the "stayed"
  screen; softened the crest copy so "it passed" isn't declared before the user
  confirms.
- **Doctrine.** EnergyTrendLine's low-readiness marker recolored off `--neg`
  (red never lands on the body). Reworded the day-1 Guardian drift copy to own
  the window YOU flagged instead of asserting a relapse history a new user never
  had (nocebo/priming). The deck's accent timer no longer promotes the wake row
  (a 50:00 "Wake — feet on floor" timer); every focusGoal now seeds a real
  anchor block; isDay0 covers a brand-new (never-reset) book. `wipeAll()` now
  clears all `lockedin:*` sidecars except the entitlement. The share card's
  imprint became an acquisition line ("On the App Store"), not a dead end.
- **Landing page rebuilt** in the app's own Split Ledger tokens + voice — no more
  neon "command center" selling the opposite of the manila app, no fabricated
  `Math.random` queue rank, no dead `lockedin.app` referral link. Honest capture
  + the free-book/paid-coach story + a preview that matches what ships.
- **250 unit + 18 E2E green, build clean, browser-verified** (landing page,
  day-0 deck, READ label, wake-timer fix). Carried (not fixed): AA-contrast on
  lane-red (needs a token-level pass), the 15-min drift-card cadence, the "Sync &
  Refactor" jargon, and other MEDIUM/LOW items logged in the review.

---

**A3 — "Perfect the champion": the Design Foundation Handoff v2 implemented
(D1–D8).** Claude Design's Split-Ledger v2 kit (source-spec + 5 rendered
surfaces) was implemented as a gated 7-phase reskin+gap-fix (art — icon,
screenshots, video — stays Ian's, per his call). Each phase gated on
vitest+playwright+build+browser.

- **D1 · Foundation.** Added the radius tokens (`--radius-card/-control/-sheet`)
  + `--type-scale` + `--dur-stamp`; aligned the motion keyframes to the kit
  (deeper `breath` .42↔1, 3-key `sealPress` 520ms, new `hapticBeat`); the
  print-chrome kit + Arc primitive were already shipping. New `lib/haptics.js`
  (the grammar: `sealCommit`/`selectionTick`/`warmSeal`, API-verified) and
  `lib/dynamicType.js` (the `--type-scale` seam + `[data-ax]` reflow, wired into
  App mount). Full px→rem sweep deferred to per-surface phases (documented).
- **D2 · Seal ceremony (grammar).** `HoldButton` gained a `commit` prop → one
  SUCCESS haptic on a commit, warm on press; **silence on a slip** (fixed the
  prior violation where logging a slip buzzed). Wired `sealCommit()` at every
  commit point (post-row, DeepWork "Posted", "I stayed", INITIALIZE, ConfirmSheet
  seal). The 216px ceremony-ring VISUAL flagged as follow-on polish.
- **D3 · De-box (G2).** `SettingsSheet` `Section` box → hairline-ruled section;
  controls → 6px; the sheet lip → the deliberate 10px (`rounded-t-sheet`);
  Wellness/WeeklyReview control radii to 6px. (Config already squared xl/2xl/3xl.)
- **D4 · EnergyTrendLine (G3).** Redrawn off the perps costume → a ruled ledger
  chart: carbon-ink line on hairline gridlines, ink/amber margin ticks, small
  ruled "now" marker, no gradient/guides/glow. Same data model.
- **D5 · Monetization (G4).** CoachGate → a covetable "closed ledger page"
  (blurred ruled lines under a ◆ wax seal, "Your book stays free. Always.").
  Paywall → a **structural two-column free-vs-coach split** (a free feature can't
  be sold as paid) + a personalized header from the user's own onboarding answers
  (danger window / witness, never invented) + one `TRIAL_DAYS` token.
- **D6 · Day-0 (G10).** The empty-book hero is now an INVITATION ("The book opens
  · Day one · Your first entry goes here."), never a stark "0".
- **D7 · Native + cleanup (G1/G7/G8).** Jargon "Sync & Refactor" → "Rule off the
  day" / "Day ruled off" / toast "Tomorrow's page is set."; `Info.plist`
  `UIDesignRequiresCompatibility=YES` (iOS-26, temporary); deleted the dead
  `StreakClock.jsx` (9 dead ui.jsx exports flagged — tree-shaken, follow-up).
- **D8 · App Store scaffold (G9).** The Home-Screen widget repainted from the
  retired perps look to **manila paper** (heroes "DAYS ON THE BOOK n", ◆ seal,
  hairline; `daysOnBook` bridged through widgets.js) + a reusable manila
  screenshot-frame template. Final icon/screenshots/video = Ian's.
- **251 unit + 18 E2E green, build clean; browser-verified** the CoachGate,
  two-column paywall, day-0 hero, all three skins. Native seams (haptics,
  status-bar-per-skin, widget) device-verified with the StoreKit step-3 runbook.
  Flagged follow-ons: the ceremony-ring visual, the 9 dead ui.jsx exports, the
  full px→rem Dynamic Type sweep, @capacitor/status-bar per-skin wiring.
