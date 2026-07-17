# TELEMETRY — COMPLETE DESIGN BUILD SPEC
### The one file Claude Design builds from. Grounded in the shipping code, not the docs. · 2026-07-14

> **Read this first, build from this.** It was written by walking the actual `src/` — every
> surface, widget, sheet, overlay, and state that ships today — and checking it against the
> handoff. The strategy kit (`01`–`05` in this folder) is the *why*; **this file is the
> what-and-where**, exhaustive and code-true. Where this file and any older doc disagree,
> **this file wins** (it matches the code). Token contract + return format: `05-INTEGRATION-CONTRACT.md`.
> Self-grade before returning: `04-DESIGN-RUBRIC.md`.

The app is **already ~80% on-brand** — the Split Ledger tokens ship, the deck widgets are
de-boxed, the psychology hard-rules hold. Your job is **not a from-scratch redesign**. It is:
(1) design the surfaces that were never designed, (2) fix the specific inconsistencies below,
and (3) make it native for iOS 26. Everything tagged ✅ is a keep-and-polish; everything tagged
⚠️ or ➕ is real work.

---

## PART 1 · THE REAL APP MAP (what actually ships)

Legend: ✅ on-brand, polish only · ⚠️ inconsistent / needs a fix · ➕ not designed yet

```
APP SHELL (App.jsx)
├─ StatusStrip (fixed top)            ✅  LED (ON DEVICE/LIVE/OFFLINE) + queued chip · signal bars + mono clock
├─ NavBar (fixed bottom)              ✅  6 slots: Deck · Sprints · Health · Guardian · Command · HELP
│                                          inline SVG icons, accent on active + on HELP
├─ SURFACE: DECK (LiveDeck)           ✅  the generative day — the hero surface
│   ├─ BookHeader                     ✅  "DAYS ON THE BOOK <n>" (5xl mono) · run/wk · Share
│   ├─ MilestoneShareCard             ✅  day 7/30/100/365 share moment
│   ├─ payload tab strip              ✅  TODAY / TRENDS (server-ordered), active = accent underline
│   ├─ 12 WIDGETS (registry)          ✅/⚠️ see Part 3B
│   ├─ RefactorIndicator (footer)     ⚠️  "Finish day · Sync & Refactor" — JARGON (G7)
│   └─ NightPageLine (footer)         ✅  "Slipping? Open the night page →"
├─ SURFACE: SPRINTS (Sprint)          ✅  idle setup + full-screen SprintTakeover (run/break/finish)
├─ SURFACE: HEALTH (HealthPanel)      ✅  readiness band · HealthKit KpiTiles · morning check-in door
├─ SURFACE: GUARDIAN (GuardianPanel)  ✅  drift sentinel (gated) · the record (3 piles + timeline) · protocol intel (gated)
├─ SURFACE: COMMAND (CommandPanel)    ✅  operator ID · book/sync diagnostics · Settings + Review doors
└─ OVERLAYS (shell-owned)
    ├─ UrgeProtocol  "OUTLAST IT"      ✅  the night page — data-invert, counts UP, forged steps, hold-to-log
    ├─ Paywall + CoachGate             ⚠️  generic value grid (G4) · CoachGate under-designed
    ├─ SettingsSheet                   ⚠️  full settings — NOT de-boxed (rounded-xl/2xl, G2)
    ├─ WeeklyReview (Sunday Debrief)   ⚠️  coach-gated · NOT de-boxed (G2)
    ├─ WellnessSheet (morning check-in)⚠️  NOT de-boxed (G2)
    ├─ ConfirmSheet (seal the day)     ✅  hold-to-seal ceremony
    ├─ Sheet (base bottom-sheet chrome)⚠️  rounded-t-3xl lip (G2 — decide)
    ├─ LegalSheet / LegalOverlay       ✅  privacy/terms dialog
    └─ Toast                           ✅  one-line acknowledgment

FIRST-RUN (pages/Onboarding.jsx)      ✅  "opening your book" — conditional node-graph diagnostic (G11: add to deliverables)
MARKETING (pages/Waitlist.jsx)        ✅  landing, already Split-Ledger with a manila SamplePage
NOT DESIGNED YET                       ➕  app icon (iOS 26) · Home-Screen widget · App Store screenshots + preview video (G9)
```

**The real deck tabs (from `defaultLayout.json`)** — not TODAY/TRENDS/MIND; MIND was retired:
- **TODAY:** DailyBriefing → ScheduleMatrix → KpiGrid → GoalProgress → DeepWorkTimer
- **TRENDS:** InsightCard (Counsel) → EnergyTrendLine → KpiGrid → BiometricChart ×2 → StatRow

---

## PART 2 · THE GAP REPORT (what's missing or inconsistent — the heart of the ask)

Ranked. Each is real, code-located, and additive to the champion.

**G1 · The iOS-26 / Liquid Glass native boundary is undesigned. [BLOCKER]**
Nothing in the app or handoff addresses Liquid Glass, and since **April 28 2026 every App Store
build must use the iOS 26 SDK** (already past). The manila web content is safe (content layers
aren't glass), but the surfaces the app doesn't draw — **StoreKit paywall sheet, iOS share
sheet, permission prompts, the local notification, the Home-Screen widget, the app icon, the
status bar** — now live in the glass world. *Fix:* design the seam (Part 3F). Decision recorded:
v1 sets `UIDesignRequiresCompatibility = YES` (temporary — dies in Xcode 27).

**G2 · Sheets & settings were never de-boxed — they still carry terminal-era rounding. [MAJOR]**
The deck widgets are properly de-boxed (`Card` = `border-b border-line`, radius 0). But
`Sheet` uses `rounded-t-3xl`; `SettingsSheet` Sections are `rounded-2xl`, rows `rounded-xl`;
`WellnessSheet` and `WeeklyReview` use `rounded-xl`/`rounded-2xl` throughout. So the moment a
user opens Settings or the Sunday Debrief, the manila-ledger doctrine breaks and it looks like a
different, rounder app. *Fix:* bring every sheet into the radius-0 / hairline system (`--radius-control: 6px`
max on controls). Make ONE deliberate call on the bottom-sheet lip: either square it, or allow a
single small top radius as the "page lifted from the stack" — specify which and apply it everywhere.

**G3 · EnergyTrendLine still reads as a crypto-perps price chart. [MAJOR]**
Its own header comment says *"rendered as a crypto-perps PRICE CHART"* — gradient area fill,
dashed hi/lo guides, a "now" trade rule, peak/low markers. It's the single least Split-Ledger
widget on TRENDS. It already obeys the hard-rule (low = amber/warn, never red on the body), so
the *psychology* is fine — the *vocabulary* is wrong. *Fix:* redraw it as a **ruled ledger
chart** — hairline gridlines, a carbon line, ink peak/low tick labels in the margin, the "now"
point as a small ruled marker, no gradient glow. Keep the data model; change the costume.

**G4 · CoachGate is the whole monetization funnel and it's a plain locked card. [MAJOR]**
`CoachGate` renders in place of every gated coach surface — the **InsightCard "Counsel"** on
TRENDS, the **drift sentinel** and **protocol intelligence** on GUARDIAN, and the **Sunday
Debrief**. It's the most-seen paywall trigger in the app, currently a small `border-l-2` card:
"Coach · locked" + one italic line + "Hire the coach — 7 days free." *Fix:* design CoachGate as
a first-class, covetable locked state (it should make the coach feel like a closed ledger page
worth opening), and design the **Paywall it opens to reflect the user's own onboarding answers**
(his danger window, his focus goal, his witness) — see G on the paywall in Part 3E.

**G5 · A haptic already exists — formalize it into a grammar, don't invent from zero. [MEDIUM]**
`ui.jsx` `HoldButton.complete()` calls `hapticTick()` — *"one soft tick on completion — the only
sanctioned haptic."* So the seal/commit already buzzes once; the discipline is right. *Fix:*
extend it into the full **haptic grammar that mirrors the accent** (Part 3A): the one success tap
on every seal/commit (post a block, INITIALIZE, "I stayed", finish the day), an optional selection
tick on detents/tabs, and **nothing** on a miss/reset/slip. Wire the extra commit points to the
same Capacitor Haptics call.

**G6 · Dynamic Type is unsolved — a rejection risk. [MEDIUM]**
Type is fixed px throughout (`text-[11px]`, `text-[46px]` clocks, `text-[13px]` rows). Apple
expects text to honor the user's size; custom fonts that don't scale can be grounds for
rejection and exclude low-vision users. *Fix:* a scaling + reflow story (Part 3A) — relative
units, hero mono that scales, column-stacking reflow for ScheduleMatrix / KpiGrid at AX sizes.

**G7 · Engineer jargon leaks through the ledger metaphor. [MINOR]**
`RefactorIndicator` renders **"Finish day · Sync & Refactor"**, **"Refactor queued · deck
rebuilds tomorrow"**, and the toast **"Sealed. Deck rebuilds overnight."** "Refactor / sync /
deck" is engineer-speak. *Fix:* recast in ledger voice — e.g. **"Rule off the day"** / **"Day
ruled off — tomorrow's page is set."** (`ConfirmSheet` already says "Seal the day"/"Hold to
seal" — good; make the button match.)

**G8 · `ui.jsx` carries ~8 dead legacy components from the pre–Split-Ledger era. [MINOR]**
Defined but imported nowhere in the app: **StreakClock** (the old race-clock), **ConsiderCard /
ConsiderResource** (replaced by InsightCard), **DataTable, ScoreboardUnit, ScoreboardColon,
CheckRow, TriStateBox, BackHeader, AccentChip**. Their comments still say "gold," "DraftKings-style,"
"terminal/command-center," and `ConsiderCard` is `rounded-2xl`. *Fix:* **do not design these** —
flag them for deletion in your return notes so the library matches the shipped surface.

**G9 · App Store assets, the app icon, and the Home-Screen widget are not designed. [MAJOR]**
`ios/App/TelemetryWidget/` exists as a native target with no visual spec; there's no iOS-26
layered icon; screenshots are a shot-list in `ASO.md`, not designed art. ~50% of App Store
conversion rides shots 1–2 + the icon. *Fix:* Part 3G.

**G10 · Empty / first-run states exist in logic but aren't designed. [MEDIUM]**
`defaultLayout.json` shows a day-1 deck with "—" placeholder stats; `EmptyState` and
`LedgerNotice` exist. But "an empty book on day one" — the first thing a new subscriber sees —
isn't a designed *invitation*. *Fix:* Part 3B (EmptyState) + Part 3D (Deck day-0).

**G11 · Onboarding is excellent but isn't on the design deliverables list. [MINOR]**
`Onboarding.jsx` is a strong conditional node-graph already in Split Ledger tokens — but it's
the Day-0 conversion event (82% of trials start here) and deserves an explicit design pass
(Part 3H), especially the seal moment (INITIALIZE) and the "Processing / Opening the book" screen.

---

## PART 3 · THE BUILD MANIFEST (design every item; real props + states + the fix)

### 3A · Foundations (design once, applies everywhere)

- **Tokens** — 3 skins (`split_book` light default · `lamplight` warm dark · `carbon` cool
  dark) + `[data-invert]` night-page inversion. Exact hexes + var names: `05-INTEGRATION-CONTRACT.md`
  §B (they match `src/index.css` — verified). All glow tokens resolve to `none`.
- **Type trio** — IBM Plex Mono (every numeral/time/total, `tnum`, 400/500) · New York serif
  (`ui-serif`; ceremony, WeeklyReview headline, InsightCard italic) · SF Pro (body/labels/UI).
  Hierarchy from size + mono/serif contrast, never weight > 600.
- **Motion — four verbs only:** ink-settle (160ms) · breath (1800ms, running clocks only —
  the code uses `animate-pulse-accent`) · rule-draw (1200ms, the seal sweep) · seal-press
  (0.98→1). Everything collapses under `prefers-reduced-motion`. Do not add Liquid-Glass fluidity.
- **Print-chrome kit** — six utilities (`.rule .rule-double .ticks .stamp .slip .field-no`) +
  ONE Arc primitive (conic ring + ticks) for: seal hold-ring, onboarding progress, DeepWork
  progress, any gauge. No per-widget chrome beyond these seven.
- **➕ Haptic grammar (formalize G5):** one `notification-success` tap on every **seal/commit**
  (post a ScheduleMatrix row, DeepWork "Posted.", "I stayed", INITIALIZE, "Rule off the day" seal);
  lightest **selection** tick on onboarding detents / nav / tab change (optional); **none** on
  miss/reset/slip/scroll. `.prepare()` before the seal. Respect the system haptic setting. Wire
  via the Capacitor Haptics plugin; the existing `hapticTick()` is the template.
- **➕ Dynamic Type contract (G6):** body/labels in relative units honoring text size (floor
  11px); hero mono scales; ScheduleMatrix rows and KpiGrid cells **stack** at AX sizes; 44×44
  targets (already largely honored — keep). Deliver an **AX3 reflow** note per hero screen.

### 3B · The 12 widgets (the generative deck — real `config` contracts from `widgets.jsx`)

Each is a `Card` (de-boxed: `border-b border-line bg-surface`, radius 0). Design each in
**Split Book + Carbon**; the night-inverting ones also in the `[data-invert]` family.

1. **ScheduleMatrix** ✅ `{title?, rows:[{time,block,status:'hit'|'done'|'late'|'missed'|'open'|'skip',impact?:'high',delta?:{value,dir,suffix?}}]}` — the heat sheet. ◆ lane-red margin diamond (page's only accent); tap posts/undoes; **StateGlyph:** done=ink ✓, late=warn –, **missed = open graphite ○ (never red, never ✕)**, open=faint —. Header `n/total EXEC`. *Polish the focal read + the post→seal micro-moment (haptic).*
2. **KpiGrid** ✅ `{title?,cols?,items:[{label,value,unit?,delta?,deltaSuffix?,spark?,sparkTone?,accent?}]}` — trial-balance strip: hairline column rules, small-caps labels, mono figures, optional sparkline. No tile boxes.
3. **StatRow** ✅ `{title?,cols?,items:[{label,value,delta?,deltaSuffix?,accent?}]}` — a compact ruled row; doubles as the lifetime-piles row (accent on the headline pile only).
4. **BiometricChart** ✅ `{label,value?,unit?,delta?,deltaDir?,deltaSuffix?,tone?,data:[]}` — label + value + DeltaTag + 84px Sparkline. External data only; ▲▼ glyphs, no tinted pills.
5. **GoalProgress** ✅ `{title?,items:[{label,value,max,right?,tone?}]}` — stacked BarMeters. Consider the champion's "rule-draw line, not a bar" for the hero item.
6. **DeepWorkTimer** ✅ `{label,minutes,at?,highImpact?,note?}` — phases idle→running→paused→done. **Cockpit** = `data-invert` full-screen (`fixed inset-0`), 7xl ink mono, breathing lane-red underline, "▾ Collapse". Done → "Posted." + `seal-press` + haptic. ◆ HIGH IMPACT chip. *This is a hero — give the cockpit its full design.*
7. **InsightCard** ⚠️ `{heading?,source?,text,tone?,onDismiss?,dismissLabel?}` — coach's margin note: `border-l-2`, serif italic, ochre left rule when `tone` is warn/neg (never red). **Coach-gated when `heading==='Counsel'` → renders CoachGate (G4).** *Design both the note and its locked state.*
8. **DailyBriefing** ✅ `{date?,stats:[{label,value,tone}],drivers:[{tone,text}]}` — report header (ink, no accent), stat cells, driver lines prefixed **"READ"** (never "AI" — local logic in v1). Day-0 shows "—" stats + "First day…" driver.
9. **EnergyTrendLine** ⚠️ `{label?,unit?,points:[{t,v}],open?,avg?,now?,ticks?,caption?,height?,tone?}` — **redraw off the perps costume (G3)** into a ruled ledger chart. Keep pos/warn tone logic (never red on the body).
10. **EmptyState** ✅→➕ `{label?,hint?}` — dashed hairline + "NO SIGNAL" + flat dashed line. *Extend into the designed day-0 invitations (G10): empty deck, empty WeekGrid, never-run timer — "a fresh page waiting," not "broken."*
11. **FaithCard** ✅ `{verse?,ref?,position?,cue?}` — "Offered," verse, reference, cue. **Never scored** — no numbers/deltas/progress. The quietest card; zero accent. Renders only when the faith module is on.
12. **WeekGrid** ✅ `{title?,days:[{d,pct,sealed}]}` — seven ruled cells, pct + bar + sealed mark (accent ✓). Share affordance. *This is a retention hero (accumulation) — make it the most photogenic thing in the app.*

**Primitives to cover (in use):** Card · SectionLabel · Stat · Grid · KpiTile · Sparkline ·
BarMeter · DeltaTag (▲pos/▼neg/▬muted) · StatusLED · LifetimePile · LedgerNotice · HoldButton
(the seal ritual) · CoachGate. **Do NOT design (legacy/dead, G8):** StreakClock, ConsiderCard,
ConsiderResource, DataTable, ScoreboardUnit, ScoreboardColon, CheckRow, TriStateBox, BackHeader,
AccentChip.

### 3C · The five nav surfaces (real, from the screen files)

- **DECK** ✅ — BookHeader ("DAYS ON THE BOOK", the lifetime hero) + MilestoneShareCard + payload
  tab strip + widgets + RefactorIndicator (⚠️ rename, G7) + NightPageLine.
- **SPRINTS** ✅ — idle: 20/25 presets (current-line select), label input, lane-red **Start**,
  "Today's target" six ink marks, Last-7-days bar chart, one-time Focus-shortcut helper.
  **SprintTakeover** (full-screen): 5.5rem ink mono clock (breathes running), Pause/Resume/End,
  "+5 finish this thought", "Silence my phone (iOS Focus)", break mode, "Sprint done." + park-note.
- **HEALTH** ✅ — Readiness band (low/moderate/high; "—" + honest notice when no signal),
  Today-vs-baseline KpiTiles (Sleep/HRV/Steps/Resting HR), **"Enable Health access"** native
  permission button, Morning check-in row → WellnessSheet door.
- **GUARDIAN** ✅ — Drift sentinel (band + named vector rows with evidence dots; **composite score
  NEVER shown**; coach-gated → CoachGate), **The record** (3 LifetimePiles: day run · urges
  outlasted · resets·data + a neutral win/reset timeline at *identical* weight), Protocol
  intelligence (BarMeters of learned steps; coach-gated).
- **COMMAND** ✅ — Operator (name · engine type · interface · wake anchor), Your book (connection ·
  sync), buttons to Settings + Weekly review. Human labels only, no raw keys.

### 3D · Deck chrome & shell

- **StatusStrip** ✅ — LED (ON DEVICE=pos / LIVE=accent / OFFLINE=muted-still) + "queued n" chip;
  signal bars + mono clock. Connectivity truth only, never Guardian severity.
- **NavBar** ✅ — 6 inline-SVG icons (deck cards · stopwatch · pulse · shield · sliders · HELP
  shield). Active = accent; HELP = always accent (crisis is the commitment path). *Design the icon
  set crisply in the Split Ledger stroke; ≥44px targets, pb-safe.*
- **BookHeader / MilestoneShareCard / NightPageLine / RefactorIndicator** — per Part 1; RefactorIndicator copy fix (G7).
- **Share cards** (`shareCard.js`, canvas 1080×1920) — the BookHeader "Share" and WeekGrid "Share"
  render story cards in the active skin. *Design the two card layouts (book hero + week's balance).*

### 3E · Overlays & sheets

- **UrgeProtocol "OUTLAST IT"** ✅ (the most important screen) — `data-invert` night page in every
  skin; **counts UP**; **lifetime "Outlasted" pile dominant**, "this ride" secondary; forged steps
  strictly in order (current = `border-accent-deep bg-surface2` + NOW chip; done = muted ✓); the
  **partner-text step** (one-tap `sms:` per partner); **"I stayed"** arms at 60s (accent when past
  15:00 crest); **HoldButton "Hold to log the slip"** (1.2s, cancel-free, the one sanctioned haptic);
  stayed/slipped close screens (slip = plain ink, "STILL YOURS," **no red**); **CrisisLine** (988
  call + text + findahelpline) on active/stayed/slipped. *Polish, don't redesign — get the invert
  values and the step rhythm exactly right.*
- **Paywall** ⚠️ — "The coach" contract page: states = **hire** / **hired** / **lapsed**
  ("The contract lapsed. The book never closed."); 4 bullets (each sells a *coach-only* read,
  never a free feature); plans (annual pushed, monthly), lane-red **Start 7 days free** (the one
  accent), 3.1.2 auto-renew line, Restore/Privacy/Terms on their own 44px row. *Fix (G4):
  personalize the header from onboarding answers; make the free-vs-coach split structural (two
  columns) so a free feature can't be sold as paid; trial length = one string/token.*
- **CoachGate** ⚠️ — the locked-state card gated surfaces render (see G4). *Design it as a covetable
  "closed ledger page," not a thin notice.*
- **SettingsSheet** ⚠️ — name · wake/phone-down times · **ThemePicker** (3 skins) · **Modules**
  (Faith/Recovery/Monk toggles) · accountability partners (add/remove — they power HELP + the
  night-page text) · reading plan · Focus-shortcut name · the fine print (privacy/terms) · retake
  diagnostic · export/import/wipe (two-tap). *De-box it (G2): kill rounded-xl/2xl, use hairline
  ruled sections; keep the `input` field style consistent.*
- **WeeklyReview (Sunday Debrief)** ⚠️ — coach-gated (CoachGate if not entitled); prior "one change,"
  4 DebriefStats, money/long-run line, weeks-to-report countdown, 3 questions, Save, Download backup,
  "New week. One change. Go." *De-box (G2); this is the serif's home — give the headline New York.*
- **WellnessSheet (Morning readiness)** ⚠️ — 3 tap dims + optional RHR + "Fill from Health" +
  readiness readout (bars + label + cue) + last-7 trend. *De-box (G2).*
- **ConfirmSheet** ✅ — the seal ceremony sheet (body + HoldButton "Hold to seal" + "Not yet").
- **Sheet (base)** ⚠️ — bottom sheet: backdrop + grab-handle + title + ✕. *Resolve the `rounded-t-3xl`
  lip (G2): square it or allow one small top radius as "the page lifted from the stack" — pick and
  document.*
- **LegalSheet / Toast** ✅ — dialog for privacy/terms; one-line toast. Keep.

### 3F · The native boundary (G1 — design the seam, per `01`/`02`)

Status bar content style **per skin** (dark on manila, light on Carbon/Lamplight) · exact safe
areas (Dynamic Island top, home-indicator bottom) · native sheets (StoreKit paywall, share,
permission) **tinted to the active skin** · native scroll momentum · `UIDesignRequiresCompatibility=YES`
for v1 (documented temporary). Deliver the treatment notes; eng wires them (`05` §F lists hooks).

### 3G · App Store assets, icon, widget (G9)

- **App icon** — iOS-26 **Icon Composer, 3 layers** (manila ground · carbon hairline ring ·
  lane-red seal) + **dark + monochrome/tinted variants**. Reads at 60px; survives monochrome
  where neon dies.
- **Home-Screen widget** (`TelemetryWidget/`, small + medium) — manila ground, "DAYS ON THE BOOK
  <n>", one seal, hairline. The paper object among the glass icons.
- **6 screenshots** (manila frame system, high-contrast OCR-legible carbon captions, value prop
  top-left) + **15–20s app-preview video** built on the seal ceremony / stopwatch-cut-to-manila.
  Shot list in `marketing/ASO.md`; make them designed art, not screen grabs.

### 3H · First-run & marketing

- **Onboarding** ✅ (G11 — add to deliverables) — "opening your book," conditional node-graph.
  Node types to style consistently: BaselineGrid (numeric grid), SelectGrid (2-up cards, current-line
  select), EnginePanel (44px time input + segmented), ProtocolPanel (module + AI-consent toggles),
  RawChoice (semantic radios), HealthLinkPanel (semantic checkboxes + disabled), MissionField,
  StakePanel (witness name/phone). Header "TELEMETRY · opening your book · NN/NN" + ink progress
  rule. **NEXT = ink, INITIALIZE = the one lane-red seal.** Design the **"Opening the book"
  Processing screen** too. *Selection is a micro-commitment — give the detent-fill + the seal weight.*
- **Waitlist landing** ✅ — already Split Ledger (manila `SamplePage` preview, "It never shames
  you," free-book/paid-coach VALUE list, honest email capture). Polish only; keep parity with the app.

---

## PART 4 · WHAT TO RETURN

1. **Token `.css`** — 3 skins + `[data-invert]`, exact names/values per `05-INTEGRATION-CONTRACT.md`
   §B (verified against `src/index.css`).
2. **Print-chrome kit + Arc primitive** as copy-paste CSS.
3. **High-fidelity HTML previews** (inline CSS, system fonts) for: the 12 widgets · the 5 surfaces ·
   deck chrome · all overlays/sheets (de-boxed) · UrgeProtocol · onboarding (3–4 representative
   nodes + Processing + INITIALIZE) · the personalized Paywall + CoachGate · empty/day-0 states ·
   in **Split Book + Carbon** (Lamplight for the night surfaces), with a theme switcher.
4. **The seal ceremony** as a timed interaction spec (rest → rule-draw sweep 1200ms → seal-press →
   posted), with the haptic beat + reduced-motion fallback.
5. **The haptic grammar** table mapped to Capacitor calls.
6. **Native-boundary** treatments (status bar, native-sheet tint, widget, icon layers).
7. **App Store asset set** (6 shots + preview-video storyboard + layered icon variants).
8. **Per-hero-screen AX3 reflow** notes.
9. **A cleanup note**: the dead `ui.jsx` components to delete (G8), the jargon strings to rename (G7).
10. **A filled `04-DESIGN-RUBRIC` scorecard** (Gate PASS, ≥92).

**The non-negotiable spine (auto-fail):** a miss is an unposted line — never red, never a verdict;
lane-red only on commitment (seal/Start/◆); lifetime piles dominate day-zero; no confetti/badges/
points/leaderboards/streak-loss/variable rewards; the intercom carries every slip; HELP + 988 one
tap away. If a design is beautiful and breaks one of these, it's wrong.
