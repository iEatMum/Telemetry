# TELEMETRY — Behavioral & Architectural Blueprint

*v1 · 2026-07-01 · the synthesis document. Maps the behavioral design (PSYCHOLOGY.md,
the Guardian design panel, DESIGN.md's doctrine) onto the shipped code — the 5-surface
shell, the generative deck, and the three Guardian engines. This is the reference for
the final visual-polish pass. Where this document and older docs disagree, this
document rules; where it and the code disagree, the **P-directives in §6 are the
work list** — everything else describes what is already built and verified.*

---

## 0 · Supersession map — what still binds, what this replaces

| Document | Status |
|---|---|
| **PSYCHOLOGY.md** | **Binding, untouched.** Every mechanism cited there is load-bearing. The AVE ("a reset is data, not failure") remains the spine. |
| **DESIGN.md §1, §6, §7** (Witness-not-Dashboard, the Guardian's voice, the hard rules) | **Binding, carried forward.** The soul survives the reskin: two registers of truth (witnessed = `font-clock` machine-truth; claimed = sans), silence is content, inverted friction, no shame in any pixel. |
| DESIGN.md §2 (still-water / deep-gold tokens) | **Superseded** by the P3 terminal reskin: 3 complete theme palettes (`terminal` electric-green #16f08b / `zen` / `night_ops`) as CSS vars on `<html>`. The **gold rule survives translated**: `--accent` is earned, never decorative — streak clock, active timer, the single primary action, HELP NOW. |
| DESIGN.md §3–4 (three-face IA: Morning/Examen/Offerings) | **Superseded** by the hybrid shell (§1 below). The three faces' *rituals* survive as components (Examen/Offerings screens retired but kept; Handover/Counsel live in the deck + Guardian surface). |
| Guardian design panel (3 designs, 2026-07-01) | **Mined.** Adopted/deferred/rejected rulings in §5. |

---

## 1 · The shell map — five surfaces, one deck

Fixed bottom `NavBar` (surfaces = app chrome). The AI never controls the nav; the nav
never controls the AI's layout.

| Surface | File | Purpose | Data source | Register |
|---|---|---|---|---|
| **DECK** | `LiveDeck.jsx` → `LayoutHost` | The generative day. Payload tabs (TODAY/TRENDS/MIND…) belong to the layout, not the shell. | `ui_layouts` (AI) → `buildLiveLayout` fallback → transform chain | Mixed: witnessed numbers mono, AI drivers sans |
| **SPRINTS** | `screens/Sprint.jsx` | Deep-work cockpit. Hides everything while running. | local `sprints` slice | Machine-truth countdown |
| **HEALTH** | `screens/HealthPanel.jsx` | Biometrics vs *personal* baseline. Never absolute pass/fail. | `health.readToday()` + guardian sidecar baselines + `wellness` | Witnessed (mono, deltas) |
| **GUARDIAN** | `screens/GuardianPanel.jsx` | The explainability surface: drift vectors + evidence, win/reset timeline, forge efficacy. Composite score **never shown**. | `useDriftSentinel` + `stepStats` + `streak` | Witnessed ledger tone — this is the new home of "The Record" energy: no accent, data lines |
| **COMMAND** | `screens/CommandPanel.jsx` | Operator profile + system diagnostics + doors to SettingsSheet / WeeklyReview. | `settings` + `sync.status()` | Quiet console |

**Chrome inventory (all of it):** status LED strip (fixed top, `pt-safe`) · bottom
`NavBar` (fixed, `pb-safe`, 44px+ targets) · HELP NOW pill (floats `.bottom-help`,
**every** surface — struggle has no schedule) · overlays: `UrgeProtocol`,
`SettingsSheet`, `WeeklyReview`. The old floating gear is deleted; the Sync & Refactor
bar is **in the deck's scroll flow** (`LayoutHost footer`) — overlap is impossible by
construction, not by padding.

**Scroll geometry:** deck `.pb-deck` = inset + 8rem; other surfaces `.pb-nav` =
inset + 5.5rem; pill `.bottom-help` = inset + 5rem. All fold in
`env(safe-area-inset-bottom)` so the stack rises together on notched devices.

---

## 2 · The generative core — ownership and the transform chain

```
architect (edge fn, Opus)         buildLiveLayout (local, offline)
        └────────── payload {tabs[]} ──────────┘
                          │
     applyReadiness   ── body:    low-readiness day → volume cut, ◆ dropped (Forgiveness Protocol)
     applyCounsel     ── record:  hydrates the Counsel InsightCard from witnessed checkpoints
     applyGuardian    ── mind:    injects the drift forecast card (LAST — nothing may clobber it)
                          │
                     LayoutHost  (payload tab strip + blocks + footer: RefactorIndicator)
```

**Ownership is strict:** the AI owns deck *content* (tabs, blocks, copy inside the
allow-list). The engines own *transforms* (immutable, idempotent, each guarding one
concern). The shell owns *surfaces and chrome*. The user owns *the data* — every
witnessed number is beyond the AI's reach (RLS: `ui_layouts` is read-only to clients;
checkpoints are Referee-written).

**Closing the loop:** engagement telemetry → `closeDay()` payload → architect refactor
(manual "Finish day" today; nightly cron `0011` deploy-gated) → tomorrow's payload.
The Guardian's urge outcomes ride `streak_state` and sharpen the same loop.

---

## 3 · The behavioral engine layer

### 3a · guardianEngine — the drift sentinel (predictive)

Six explainable vectors → 0–100 (never displayed) → band. All fail-soft; absent
data contributes zero, never a penalty.

| Vector | W | Signal | Cold start |
|---|---|---|---|
| temporalRisk | 25 | circular-Gaussian (σ=1.5h) histogram over `streak.resets` (×2) + `urgesSurvived` (×1), density at now ÷ peak | silent under 3 events |
| sleepDebt | 20 | (EWMA baseline − today) / 2.5h; fallback: wellness self-report 1–2/5 | no data → 0, no evidence |
| engagementSlip | 20 | ≥2 ignored card types (needs ≥4 dealt) | deck barely dealt → silent |
| streakPhase | 15 | d≤6 fragile 0.7 · d≤13 0.35 · summit zone (±2d of best) 0.6 | needs only `startedAt` |
| impactMisses | 10 | missed ◆ blocks today (1→0.5, 2+→1) | no ◆ today → silent |
| hrvDrop | 10 | (baseline − today)/baseline past 12% | native-only; silent on web |

**Bands + honesty gates:** stable <35 · watch ≥35 · critical ≥65, hysteresis
(exit watch <30, exit critical <55), and critical additionally requires ≥2
evidence-backed vectors — the engine cannot cry wolf on priors.

**Intervention ladder** (doctrine: severity shifts *register*, never *volume*):
- **stable** — nothing. Silence is content.
- **watch** — ONE InsightCard in the deck (forecast framing: "conditions", never "you
  will") + ONE pre-window local notification, max one per app-day, scheduled 30min
  before the predicted window opens, dedicated notification id (never the block
  scheduler's pool, which cancels its own ids on every layout change).
- **critical** — card tone escalates, copy routes to the partner. Never auto-opens
  the urge screen (agency is the treatment), never a second notification.

### 3b · protocolForge — the adaptive Outlast It

Fixed 4-beat arc (the *skeleton never varies* — perceived consistency):
**environment/interrupt → downshift → cognitive → commit**. Per-slot selection by
Laplace-smoothed per-step efficacy `(wins+1)/(n+2)` over the user's own outcomes,
ε=0.15 exploration, ties break to *lower* intensity. Hard rules: partner text is the
un-explorable crown commit step; faith-gated steps only with the module on; the
last-failed steps are benched; **the exact failed hand is never re-dealt**.

**Learning loop (zero new tables):** deal → invocation logged (local sidecar) →
WIN writes step ids onto `streak.urgesSurvived` via `logUrgeSurvived(meta)` (syncs;
wins teach every device) → losses *inferred* (reset within 6h of a deal — nobody
self-reports mid-slip) → same events feed the temporal histogram. `screen()` guards
every rendered line.

### 3c · toneEngine — psychological mirroring

Three axes, composed: **profile** (streakModel) picks the frame · **band** picks the
structure · **theme** shifts the register (edges only).

| Profile | Frame | Example (drift.watch) |
|---|---|---|
| avoidance | protect the standing asset | "Day 12 is yours; it stays yours if the phone is out of the room…" |
| accumulation | stack the pile | "…{wins} urges outlasted and counting." |
| engagement | just show up | "Nothing to win or lose tonight: just show up for the next block." |

**The AVE firewall (test-enforced):** post-slip copy is ONE compassionate voice for
all profiles. Loss-framing protects a live streak; it is structurally unreachable
against a broken one. Every lexicon line passes `guardian.screen()` in the test suite.

---

## 4 · Data topology — where every byte lives

| Class | Store | Syncs? | Contents |
|---|---|---|---|
| App data | `storage.js` slices → Supabase (LWW, realtime) | yes | settings (incl. streakModel/theme), streak (resets + urgesSurvived **with step ids**), tasks, runs, wellness… |
| Private-by-construction | `handover` slice | **never** (not in SLICES) | raw surrender drafts |
| Device telemetry | sidecars: `__engagement`, `__guardian`, `__notif_ids` | never | performance loop, EWMA baselines, invocations, notification dedupe |
| Server-authored | `ui_layouts`, `ai_runs`, checkpoints | pull-only | AI payloads, audit, witnessed verdicts |

**Ruling: no `urges` table.** All three panel designs proposed one; the implementation
found `streak_state` already syncs urge timestamps and `validate.js` deliberately
preserves unknown entry fields — so protocol fingerprints ride the existing singleton.
This eliminates the panel's own worst pitfall (a missing table wedging `pushNow`'s
throw-on-first-error loop for every slice behind it).

---

## 5 · Conflict resolutions — panel vs implementation vs old doctrine

| # | Question | Ruling | Why |
|---|---|---|---|
| R1 | Bottom tabs vs pure generative nav | **Hybrid.** 5 fixed *surfaces*; payload tabs stay AI-owned inside DECK | Surfaces are chrome, not content; reverses nothing |
| R2 | New synced `urges` slice/table | **Rejected** — streak entries + local sidecar | §4; zero migration risk, wins still sync |
| R3 | ε-greedy vs Thompson sampling | **ε-greedy shipped;** Thompson deferred | At n<30 the doctrine-critical behaviors (benching, never-repeat, crown pin) dominate outcome quality; Thompson is an upgrade, not a fix |
| R4 | EWMA vs trimmed-mean baselines | **EWMA α=0.25 shipped;** trimmed-mean deferred | Stats panel's outlier argument is real but second-order at one reading/day; revisit with real HealthKit data |
| R5 | Weight renormalization when sensors absent | **Rejected** — absent = zero + evidence gating | "An ignorant engine is a quiet engine"; renormalizing silently redefines critical on web |
| R6 | Notification budget | **1/app-day** (strictest of the three designs) | PSYCHOLOGY.md: few, action-cued; precision is spent like the accent |
| R7 | Cold-start histogram prior (bedtime-shaped) | **Rejected for v1** — silent under 3 events | A prior that pings nightly at bedtime *is* the nag doctrine bans; counsel.js already guards the evening pattern |
| R8 | Numeric risk score in UI | **Never, anywhere** (unanimous) | Re-imports all-or-nothing framing |
| R9 | Critical deck reflow (easy-wins-first reorder) | **Deferred** with guard | Valuable (mastery micro-successes) but risks training avoidance if chronic; ship after drift bands prove calibrated |
| R10 | Old three-face IA | **Superseded**; rituals survive as components | §0 |
| R11 | InitialSurvey rebuild | **Rejected** — `RequireSurvey` + `Onboarding` already gate and bucket | One write path to `user_profile` |
| R12 | Auto-open urge screen at critical | **Never** (unanimous) | Reactance; agency is the treatment |

---

## 6 · Visual tone blueprint — the polish work list

### 6a · Token semantics (all themes)

- `--accent` = *earned*: streak clock, running timer, HELP NOW, the one primary action,
  a WIN. Never decorative, never a border for emphasis.
- `--pos`/`--neg` = market semantics for *data deltas only*. **Never** on a person's
  behavior: a miss is `--muted` + dashed (TriStateBox), a reset row is muted mono.
  The single exception: the Guardian card at critical carries `tone: neg` — it
  describes *conditions*, and its copy is forecast-framed.
- `--warn` = drifting conditions (watch band, caution data). Not failure.
- `font-clock` + `tnum` = witnessed/machine-truth. Sans = human voice. This split IS
  DESIGN.md §1 and survives every theme.
- Glow follows `--glow-strength` (terminal 1 / night_ops .7 / zen 0) — zen is the
  no-glow proof that hierarchy can't depend on glow.

### 6b · Profile-adaptive emphasis (which number dominates) — TARGET STATE, not yet built

*(Verifier finding 2026-07-02: nothing implements this table yet — `streakModel`
drives copy only. Mechanism when built: GuardianPanel/HealthPanel read the profile
for pile ordering; the deck's emphasis belongs to the architect prompt, not client
hacks. Until then this section is a directive, not a description.)*

| Profile | DECK hero | GUARDIAN hero | Post-slip (all profiles) |
|---|---|---|---|
| avoidance | current-run clock, guarded | day-run pile | **lifetime piles dominate; run clock demoted — day-0 is never the only number** |
| accumulation | lifetime piles + deltas | urges-outlasted pile | same |
| engagement | today's check dots; numbers quieted | timeline (presence) | same |

### 6c · Theme registers

| | terminal | zen | night_ops |
|---|---|---|---|
| Copy | clipped imperative; caps for LABELS only, never sentences | invitations, softened verbs | quiet fragments, no exclamation |
| Visual | hairlines, zero buffers, glow on | space, buffers, no glow | dimmed, minimal, low-key |
| Guardian card | `GUARDIAN` mono label, terse body | softened body via register shift | shortest body |

### 6d · P-directives (the actual polish work, in priority order)

- **P-1 (bug-class, tone).** `toneEngine`: coerce the *frame* to engagement when
  `days < 3` or a reset is within 72h — currently `drift.watch`/avoidance can emit
  "Day 1 is yours" the morning after a reset, which is loss-framing a broken streak.
  The `urge.slipped` slot is already safe; this extends the firewall to the drift
  slots. (Panel design 2's `streakDays>=3 AND !postSlip` guard.)
- **P-2 (bug-class, notification).** `scheduleGuardianWarning`: clamp `warnAt` to
  `bedTime − 45min` and suppress inside 23:30–06:00 — a ping after phone-out orders
  him to break the phone rule to read it. (Unanimous panel finding.)
- **P-3.** Watch-band Guardian card renders mid-deck (after the briefing), index 0
  only at critical. Watch is terrain, not an alarm.
- **P-4.** `protocolForge`: ε=0 when `severity === 'high'` — exploit only in the hard
  moment, experiment in calm ones.
- **P-5.** Payload tab strip currently slides under the LED strip when scrolled
  (pre-existing): give the strip `top: calc(env(safe-area-inset-top) + 1.75rem)`.
- **P-6.** GuardianPanel: render reset rows and win rows at identical visual weight
  (verify: same type size, same muted date — only the word differs). The timeline is
  a ledger, not a scoreboard.
- **P-7 (deferred pair).** Cry-wolf tracking (suppress the pre-window notification for
  3 days after 2 consecutive unacknowledged alerts) + critical deck reflow (R9) —
  both after real-world band calibration.
- **P-8.** ✅ *(applied 2026-07-02)* UrgeProtocol post-finish: `urge.survived` line +
  lifetime outlasted count adjacent — the win lands next to the pile it grew.

*Verifier round (2026-07-02) — adversarial pass findings, with rulings:*

- **P-9 (was BLOCKING).** ✅ `ScheduleMatrix` STATUS_TONE painted `missed`/`late`
  red — a hard-rule violation live on the hero widget. Ruled: `missed` → muted
  (the word carries the fact), `late` → warn (forgiving clock, firm cue).
- **P-10.** ✅ Market conceit boundary ruling: the sentiment gauge + score/100 are
  *exempt* from R8 (market-frame data, not the Guardian's risk composite) — but the
  **MY FOCUS ticker is the person**: a down day renders muted, never `--neg`.
- **P-11.** ✅ `EnergyTrendLine` LOW ZONE red → warn: body telemetry never gets a
  red/green pass-fail (the sleep-tracker ban, applied to energy).
- **P-12.** ✅ night_ops `--accent` == `--neg` collision: InsightCard's neg tone is
  now **weight**-disambiguated (`border-l-4` vs `-2`) — semantics survive without hue.
- **P-13.** ✅ HealthPanel honesty: no snapshot → band shows `—` + "no signal", never
  a claimed "moderate"; removed the pointer to a nonexistent wellness sheet. The
  *real* fix — mounting WellnessSheet from a live surface — is open (engine-adjacent).
- **P-14 (open).** `--glow-strength` is a dead token (nothing consumes it; glow runs
  on `--accent-glow` + a hard-coded zen override). Either wire it or strike it from
  the token docs.
- **P-15 (open, engine files — excluded from the visual pass by constraint).** P-1
  (post-slip loss-frame guard in toneEngine), P-2 (bedtime notification clamp in
  guardianEngine), P-4 (ε=0 at high severity in protocolForge). **These are the top
  of the next engine pass** — P-1/P-2 are doctrine-grade.
- **Exclusions, ruled:** overlay radius normalization (global radius scale already
  compresses `rounded-2xl` to 8px; the slightly softer corners on the crisis screen
  are intentional calm) · marketing surfaces (Waitlist/Onboarding) keep their scoped
  theme, out of polish scope · Login/Splash render pre-ThemeProvider in base
  terminal palette — accepted for v1.

### 6e · Hard rules, restated for the new surfaces (violations block ship)

Never: red streak-loss states · same-day failure tallies · numeric risk scores ·
shame/self-as-bad predicates · faith as leverage · confetti/badges/variable rewards ·
escalating notifications · green/red absolute sleep tracking · scoring the spiritual.
Always: miss = neutral · lifetime piles visible · post-reset = data + redirect ·
danger routes to a person · HELP NOW one tap from anywhere.

---

## 7 · Flow maps

**First run:** waitlist/landing → magic-link auth (`AuthGate`) → `RequireSurvey`
(local, then DB probe; fail-soft) → 7-step diagnostic → `user_profile` upsert +
local apply → architect builds layout v1 (consent-gated; deterministic path without) →
DECK.

**Daily loop:** wake notification (block schedule) → morning check-in (wellness →
readiness → Forgiveness reflow) → deck engagement (recorded) → drift sentinel
re-assesses (mount / engagement events / 15min) → evening: pre-window warning if
watch+ → FINISH DAY → performance payload → architect refactor → tomorrow's deck.

**Crisis loop:** urge → HELP NOW (any surface, 1 tap) → forge deals the hand →
15:00 wall-clock + steps → *You made it* → WIN with fingerprint syncs → histogram
and efficacy sharpen → next deal is smarter. Slip path: reset logged elsewhere →
inference marks the hand → benched → compassion copy for 72h (P-1).

**Weekly:** Sunday Debrief (WeeklyReview overlay from COMMAND) — fresh-start framing.

---

## 8 · Open decisions (Ian's, not the engine's)

1. **Streak-freeze buffer** (PSYCHOLOGY.md §2 flags it): persistence data vs honesty
   value. Still open, still yours.
2. **streakModel driving scoring semantics** (not just tone): what does a "miss" do
   differently per bucket? Semantics undefined — product call.
3. **Derive the bucket from behavior** vs self-selection at onboarding (R11 kept
   self-selection; revisit with real usage data).
4. **Examen/Offerings rituals**: reinstate as payload tabs, a sixth surface, or leave
   retired? The components are intact either way.
