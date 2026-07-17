# 03 · CLAUDE DESIGN HANDOFF — TELEMETRY · "SPLIT LEDGER" v2
### The brief. Self-contained — no repo access needed. Supersedes design-prompts/HANDOFF-claude-design-split-ledger.md · 2026-07-14

*Read 01 (research) and 02 (red-team) first for the "why." This document is the "what."
It keeps everything that won the tournament and folds in all fifteen red-team fixes. The
**Integration contract is 05** — it tells you the exact shape to return so this drops into
the codebase in one pass.*

---

## 1 · Product & mandate

**Telemetry** — a paid iOS discipline/accountability app for young men (18–25, the "lock in"
niche; TikTok funnel → App Store subscription). React + Vite + Tailwind inside a **Capacitor
WKWebView**. The AI builds the user's daily schedule from a 15-node onboarding diagnostic; a
"Guardian" engine watches behavioral drift and sends **exactly one** push per day, 30 minutes
before the user's vulnerability window. Local-first, no account in v1. Free "book" (schedule,
streaks, sprints, night page/urge protocol) + paid "coach" (AI briefing, drift intelligence,
weekly review). $6.99/mo · $39.99/yr, 7-day trial.

**Your mandate: perfect the reigning champion.** Split Ledger won a 6-judge tournament (88.3)
and ships today. Take it to a **95+**. Do not redirect it. Two hard platform facts frame
everything:

- The entire skin is expressible as **CSS custom-property tokens** — a reskin is one token
  file. No per-component color literals.
- Every hero screen must survive a **30-second vertical screen recording**, and the app must
  feel **unmistakably native in the iOS-26 / Liquid Glass era** (see §12, The Native Boundary).

**Optimize, in this order:** (1) iOS-26 native polish · (2) daily-use retention feel · (3)
App Store conversion.

---

## 2 · The non-negotiable spine (auto-fail if violated)

Telemetry is shame-free by construction; its users include people in recovery. This overrides
all aesthetics. Grounded in named studies (Marlatt's Abstinence Violation Effect; Randles &
Tracy 2013, *shame predicts relapse, guilt does not*).

- **A miss is an unposted line — never red, never a stain, never a verdict on the person.**
  Missed = an open graphite circle / blank paper. `--neg` (oxblood) exists **only** for
  *external* data (biometrics, conditions), never on the person's own record.
- **Lane-red is grammatically reserved for commitment** — the seal, Start, the ◆ high-impact
  marker. It can never mark a miss. One lane-red mark per page, maximum.
- **Lifetime totals hold the dominant position; day-zero is one small line.** Never render a
  stark 0 as the biggest number on screen.
- **No confetti, badges, points, leaderboards, variable-reward reveals, streak-loss
  interstitials, or same-day failure tallies. Ever.** A posted entry is its own quiet proof;
  completion settles, it never celebrates.
- **The intercom (one warm human line)** carries every slip moment. Danger routes to a person
  (the witness), never to willpower. HELP NOW is one tap from anywhere; the 988 crisis line
  ships regardless of module state.

If a design is beautiful and breaks one of these, it is wrong.

---

## 3 · Design thesis — the athlete's split book (unchanged; it won)

Every pro keeps a book — splits, sessions, entries posted in ink. The app *is* that book:
**manila paper, carbon ink, stopwatch-grade mono numerals, hairline rules instead of boxes,
and one lane-red reserved structurally for the seal of commitment.** The timer cockpit and
urge screen **invert to ink-dark in every skin**, so the hero moments read *stopwatch, not
stationery.* A ledger only accrues: a miss is an unposted line — never a stain, never red.

Five-word pitch: **"Every pro keeps a book."** The differentiator is physical and now
structural: on a shelf (and an OS) that just went 100% glass, Telemetry is the one warm,
matte, analog object. Lean *harder* into paper — the contrast is the entire pitch.

---

## 4 · Color tokens (AA-verified — treat as final unless a contrast check fails)

Exact values, matching what ships in `src/index.css`. Themes set `data-theme` on `<html>`.

**Skin 1 — "Split Book" (default, light; `color-scheme: light`):**
`--bg #EDE4CE` (manila) · `--surface #F6EFDD` · `--surface-2 #E2D7BC` · `--line #C9BC9C` ·
`--line-bright #AC9F7D` · `--text #1F1B12` (carbon) · `--muted #6B6150` · `--faint #6C6451` ·
`--accent #C93F22` (lane-red seal) · `--accent-deep #A93318` · `--accent-ink #F9F3E2` ·
`--pos #3F6E4E` · `--neg #8E3B44` (oxblood) · `--warn #8C671A`

**Skin 2 — "Lamplight" (the vulnerable evening window, dark):**
`--bg #14100A` · `--surface #1B160E` · `--surface-2 #241D12` · `--line #3A3222` ·
`--line-bright #4E4430` · `--text #E7DCC4` · `--muted #9A8D72` · `--faint #877C68` ·
`--accent #B25B41` · `--accent-deep #8F462F` · `--accent-ink #201409` · `--pos #7FA98B` · `--neg #B07680` · `--warn #C0985A`

**Skin 3 — "Carbon" (all-day dark — co-equal with Split Book, design it FIRST among the darks):**
`--bg #101214` · `--surface #16191C` · `--surface-2 #1D2125` · `--line #2A2F34` ·
`--line-bright #3B4249` · `--text #E8E6E1` · `--muted #8D9298` · `--faint #7A7F83` ·
`--accent #C4553B` (brick) · `--accent-deep #9E4029` · `--accent-ink #F5EFE6` · `--pos #79B48D` · `--neg #C97A83` · `--warn #CFA25C`

**`[data-invert]` block (all skins):** the DeepWork cockpit and Urge screen re-point the
**same token names** to ink-dark values — full-bleed carbon page, paper-toned ink, breathing
lane-red accent. The private night page / stopwatch inversion. Baseline per-skin invert values
already ship in `src/index.css` (split_book / lamplight / carbon each invert into their own
ink-dark family) — refine them for the redesign, don't reinvent the mechanism.

**All glow tokens = none/transparent** (`--num-glow --pos-glow --neg-glow --warn-glow
--text-glow --accent-glow`). Print does not glow. Components still reference them, so they must
exist and resolve to nothing.

**Accent guard (enforce on every screen):** lane-red is **4.3:1 on manila** — a *large-text*
pass only. Use it for fills, seals, rules, the ◆ marker, and **text ≥13px at weight 500 only;
never small body text.** Where a small red label seems needed, use ink weight, not hue.

---

## 5 · Typography — the split *is* the claimed/witnessed distinction

- **Display: New York** (iOS `ui-serif`; fallback Source Serif 4, OFL) — ceremony copy,
  WeeklyReview headlines, Guardian marginalia *italic only.* Widget titles do NOT use it.
- **Body: SF Pro Text** (system) — labels, prose, the intercom voice; 15px/1.5. Column heads:
  11px uppercase, +0.08em, muted.
- **Data: IBM Plex Mono** 400/500, `tabular-nums` — the stopwatch face: every numeral, time,
  split, total. 500 at hero sizes (cockpit clock, StreakClock, lifetime totals), never bolder.
  Hierarchy comes from **size and the mono/serif contrast, not weight.**

All three sizes must honor Dynamic Type — see §13.

---

## 6 · Shape, chrome & motion

**De-boxed at the token level:** card radius **0** (6px only on tappable controls),
surface ≈ bg (one paper step), each card closed by a **single bottom hairline.** No drop
shadows, no glow, anywhere.

**Print-chrome kit — exactly six shared utilities** (spec each as reusable CSS): `.rule`
(1px hairline) · `.rule-double` (double rule under section heads) · `.ticks` (tick marks) ·
`.stamp` (seal/stamp) · `.slip` (inset note block) · `.field-no` (mono form-field numbering,
"04/15").

**Plus ONE shared Arc primitive** (conic-gradient ring + div ticks) powering the seal
hold-ring, the onboarding progress ring, the sentiment gauge, and DeepWork progress. **Do not
invent per-widget chrome beyond these seven pieces** — this constraint is binding (the
tournament developer judge).

**Motion — four verbs only, one ease:** **ink-settle** (160ms fade + 2px rise, list entries) ·
**breath** (1800ms pulse, running clocks only) · **rule-draw** (line/dash-offset sweep;
1200ms for the seal hold) · **seal-press** (0.98→1 settle on any commit). No color flashes.
`prefers-reduced-motion` collapses all four. Do **not** chase Liquid Glass's fluid animation —
calm is the brand. Spend richer motion only on the seal ceremony (§9).

---

## 7 · Rhythm & focal discipline *(fixes the de-boxing → monotony risk, red-team C1-3)*

De-boxing is the champion's nerve and its failure mode. Prevent monotony with three rules:

1. **Vertical rhythm scale:** space sections on a defined scale (e.g. 8 / 12 / 16 / 24 / 32px).
   A hairline closes a section; **air**, not a box, separates them. Give hero numerals a full
   rhythm step of space above and below — the clock breathes; the ledger rows are dense.
2. **One focal point per screen.** Answer, for each hero screen, *"where does the eye land
   first?"* — and make exactly one thing win: the DeepWork **Start** (idle) or **clock**
   (running); the **◆ high-impact row** on the heat sheet; the **lifetime total** on Trends;
   the **seal ring** on splash. One lane-red mark, maximum, per page.
3. **Density is a choice, not an accident.** Ledger rows are tight (they read as splits);
   ceremony and intercom moments are spacious. The contrast between dense-record and
   spacious-ceremony is what keeps calm from becoming flat.

---

## 8 · The three skins — registers, not recolors *(red-team C1-4)*

Each skin is a **complete palette** (never inherits from another) **and a distinct register**:

| Skin | When | Register (beyond hue) |
|---|---|---|
| **Split Book** | daylight default | crisp, upright; standard rhythm; the public book |
| **Lamplight** | the vulnerable evening window | slightly **larger line spacing, dimmer rules**, quieter — a later, softer voice |
| **Carbon** | all-day dark (co-equal) | a hair **more contrast, tighter rules**, sharper — the all-day instrument |

Design **Carbon first** among the darks so it can't become an afterthought. Same components,
different *breath*. A skin switch should feel like a change of light, not a coat of paint.

---

## 9 · The Seal Ceremony — the hero interaction *(promoted from a footnote, red-team C1-1)*

This is the most important interaction in the product: the retention driver, the App Store
video, the TikTok hook, and the one bodily moment — all at once. Design it **once**, reused on
every commit surface (Start · INITIALIZE · "I stayed" · post-a-block · outlast complete).

**Four states + the between-frames:**
1. **Rest** — the Arc primitive as a faint, un-stamped lane-red ring; a quiet label ("Hold to
   post" / "Hold to seal").
2. **Press-sweep** — pointer/space-down starts a **`rule-draw` sweep filling the ring over
   1200ms.** Early release **cancels at zero cost** — no penalty visual, ring fades back to
   rest. (Keyboard: hold Space/Enter for the same 1200ms; screen-reader path is a two-step
   confirm — friction preserved, nobody locked out.)
3. **Stamp** — at completion, the ring closes and **`seal-press` settles it 0.98→1**, the seal
   mark stamps onto the page. **One deliberate haptic fires on this exact frame** (§10).
4. **Posted** — the resting posted state: "Posted." / "Entry posted. Urge outlasted — 38
   total." No confetti. The number climbing is the ceremony.

`prefers-reduced-motion`: replace the sweep with a calm cross-fade to the stamped state; keep
the haptic. Deliver this as a **timed interaction spec** (curve, durations, haptic beat,
cancel behavior, reduced-motion fallback), not just four static frames.

---

## 10 · Haptics — an earned grammar that mirrors the accent *(red-team C3-3; research 01 §E1)*

The one sense a screenshot can't fake, and the thing that makes manila feel physical. Sparing
and meaningful; the phone must never feel buzzy. Mirror the accent rule exactly:

| Moment | Haptic | Why |
|---|---|---|
| **Seal / commit** (post, Start, INITIALIZE, "I stayed", outlast complete) | **one `notification-success`-class tap**, on the stamp frame | lane-red's physical twin — the earned touch |
| **Selection** (detent radio, tab change, chip toggle) | lightest **selection tick**, optional | confirms without shouting |
| **Miss · reset · slip · low-readiness** | **none** | silence is the point — a buzz on a slip is a bodily verdict, same reason it's never red |
| Scrolling, list entry, ambient | **none** | never decoration |

Call `.prepare()` before the seal so there's no first-tap latency; respect the system haptic
setting. Exposed via Capacitor's Haptics plugin (05 lists hooks).

---

## 11 · Screens to design — deliverables at 390×844, Split Book **and** Carbon

The original nine hero screens (unchanged intent), then the new/expanded surfaces the red-team
added. For the nine, deliver **Split Book and Carbon**; Lamplight for hero screens 2–4 (the
night surfaces).

1. **Deck "Today" tab** — a heat sheet: Plex Mono time column reads like lane splits, hairline
   rule under each row; ◆ = small filled lane-red diamond in the margin (the page's only
   accent); done = carbon ink check; missed = open graphite circle ("not posted"), NEVER red.
   Tab strip: SF Pro 11px caps; active tab = 2px lane-red underline that `rule-draw`s between
   tabs. *Focal point: the ◆ high-impact row or the running Start.*
2. **DeepWorkTimer** — idle: a blank ruled line "Next entry" + a quiet lane-red Start. Running:
   **inverts to ink-dark in ALL skins** (`[data-invert]`) — full-bleed carbon, giant Plex Mono
   500 numerals, a single breathing lane-red underline. Finished: "Posted." + seal-press.
3. **Urge protocol full-screen** — the lamplit ink-dark private night page in every skin;
   **elapsed time counts UP** (survival framing); lifetime total dominant, current run
   secondary; hold-to-seal = the Arc sweeping a lane-red seal ring closed → "Entry posted. Urge
   outlasted — 38 total." The 988 crisis line present. No red anywhere on the slip close.
4. **Guardian drift card** — a coach's pencil note in the margin: indented block, 2px ochre
   left rule, New York italic observation, plain-ink action. "Third late night this week.
   Protect the wake." Ochre at most — never red, never an indictment. Critical raises urgency
   through **weight and the ochre rule, never through red.**
5. **Onboarding node** — "opening your book," intake-with-a-coach voice: serif question
   heading, `rule-draw` progress hairline + mono "04/15"; focus-goal radios = ink-fill circles
   with a 140ms detent fill; health-link checkboxes = ruled rows with square ink ticks (+ a
   disabled/"not linked" state). Each node is a **micro-commitment posted in ink** — the
   ceremony is the investment (research 01 §C1).
6. **WeekGrid** — seven ruled cells: completed day = small round lane-red seal-mark; extra
   sprints accrue as ink tally strokes (gym-chalk); incomplete = blank paper. **No streak-break
   mark exists in the vocabulary.** This grid is a retention hero (§ below) — make it beautiful.
7. **KpiGrid / StatRow + GoalProgress** — trial-balance strip: hairline column rules, small-caps
   muted labels, mono figures; GoalProgress = a `rule-draw` line (not a bar), mono fraction at
   the right margin, "X to go" near the end. External-data deltas use pos/neg ▲▼ glyphs on the
   numeral only — no tinted pills.
8. **WeeklyReview — the Sunday page** — the serif's home: display headline, the week's figures
   as a closed trial balance, one re-commit line ("New week. One change. Go.") sealed with
   seal-press. Fresh-start framing (Dai/Milkman/Riis 2014).
9. **Login/splash + app icon** — manila field, lane-red seal ring stamped center (the Arc
   primitive), TELEMETRY in 11px caps beneath, one mono line. Icon spec in §14.

**New / expanded deliverables (from the red-team):**
10. **Empty & First-Run States** — §11a below.
11. **Personalized Paywall** — §15.
12. **Home-Screen Widget** — §16.
13. **App Store asset designs** (6 screenshots + preview video + icon variants) — §14.
14. **The intercom block** as a named pattern — §17.

### 11a · Empty & First-Run States *(red-team C1-2 — this is the first thing a new subscriber sees)*
Design the *invitation*, not the absence, for the three surfaces a new user hits first:
- **Empty deck (day 0):** a ruled-but-waiting page; a single intercom line ("First entry goes
  here."); the seal ring faint and un-stamped; **no red dots, no zeros as heroes.**
- **Empty WeekGrid:** seven blank ruled cells reading as *a fresh week to fill*, not seven
  failures.
- **Never-run timer:** the "Next entry" ruled line with a quiet Start — reads as ready, not
  empty.
Also design the ordinary **loading** (a `rule-draw` hairline, no spinner-as-anxiety) and
**offline/no-signal** states (calm "ON DEVICE" status — never a warning color; local-first is
the feature, not a failure).

---

## 12 · The Native Boundary — reconciling paper with Liquid Glass *(red-team C3-1/2 — highest-leverage addition)*

iOS 26 shipped Liquid Glass; **since April 28 2026 every App Store build must use the iOS 26
SDK** (already past — non-optional). The manila **content** is safe (Apple reserves glass for
the *navigation* layer, not content). But the surfaces Telemetry doesn't draw itself now live
in the glass world and must be reconciled or the app reads as a cheap hybrid:

- **Status bar:** bind content style to the active skin — **dark content on Split Book
  (manila)**, light content on Carbon/Lamplight. Never invisible.
- **Safe areas:** respect exactly — 59pt notch/Dynamic Island top, 34pt home indicator
  (`env(safe-area-inset-*)`). The stack (LED strip, nav, HELP pill, sync bar) rises together on
  notched devices.
- **Native sheets** (StoreKit paywall, iOS share sheet, permission dialogs): **tint to the
  active skin's ink/accent** where the API allows, so a warm-manila app doesn't hand off to a
  cold default-glass sheet. Design the seam.
- **Scroll:** native momentum + bounce on the deck (feels native, not "web page").
- **`UIDesignRequiresCompatibility` — the decision (made, design to it):** for **v1, opt out**
  (`= YES` in Info.plist) so the few native controls in play aren't unexpectedly restyled, and
  ship the deliberate paper look. Treat it as **explicitly temporary** — the flag is removed in
  Xcode 27 and Liquid Glass is mandatory in iOS 27 — and design the native surfaces above to
  **harmonize** with glass so the eventual removal is graceful, not breaking. (Documented in
  SHIPPING.md; recorded so you design toward it.)

---

## 13 · Accessibility & Dynamic Type contract *(red-team C3-4/6 — a real rejection risk)*

Apple expects text to honor the user's size (12 steps incl. AX1–AX5); **custom fonts that
don't scale can be grounds for rejection** and exclude low-vision users. The champion's fixed
11px caps + large fixed mono numerals must be given a scaling story:

- **Body & labels** in **relative units that honor the user's text size**; floor at 11px.
- **Hero mono readouts scale too** — a bigger clock is still the hero; don't freeze it.
- **Reflow rules:** the heat sheet and trial-balance strips **stack their columns** at AX
  sizes; rules stay, layout grows taller rather than clipping.
- **Contrast:** enforce the accent guard (§4); interactive targets **44×44pt**; every skin's
  `--faint` stays ≥4.5:1 on its `--bg` (already amended in code — keep it).
- **Reduced motion:** all four verbs collapse; the seal cross-fades (keeps its haptic).
- **VoiceOver:** the seal/commit, tri-state rows, and HELP NOW carry clear labels (already
  partly in code — design must not remove the affordances).

Deliver a note per hero screen showing its **AX3 (large accessibility) reflow.**

---

## 14 · App Store asset design *(red-team C2-1/2/3/5 — ~50% of conversion)*

Treat these as **first-class design deliverables**, not exports. Research: ~7-second decision,
half see only shots 1–2, captions are now OCR-keyword-ranked (01 §B).

- **6 screenshots**, one consistent **manila frame system**, captions in **high-contrast carbon
  on manila, top-aligned, OCR-legible**, keyword set from ASO.md woven in naturally:
  1. *The book hero* — manila + big carbon "DAYS ON THE BOOK 412" + one seal. Value prop
     **top-left.** Caption: *Every pro keeps a book.*
  2. *The heat sheet* — ◆ margin diamonds, ✓/○ mixed. *Post the day. Misses are ink withheld —
     never red.*
  3. *The night page* (Carbon/inverted, count-up bezel). *Urges crest and pass. Outlast them.*
  4. *The Guardian* — drift note. *Drift caught upstream, in your danger window.*
  5. *The week's balance* grid. *The week reconciled. One change named.*
  6. *Onboarding* — "opening your book." *Answer honestly. The protocol adapts.*
  Add **one honest social-proof band to shot 1** the moment a real number exists (rating,
  aggregate) — never fabricated.
- **App-preview video (15–20s loop):** black → carbon stopwatch counting → thumb press → seal
  sweeps closed → cut to manila, entry posted → "Every pro keeps a book." Doubles as the TikTok
  hero asset.
- **App icon (iOS 26 Icon Composer):** design as **3 layers** — manila ground · carbon hairline
  ring · lane-red seal — with **explicit dark and monochrome/tinted variants.** The seal ring
  reads at 60px and survives monochrome where neon gradients die. Export per 05.

---

## 15 · The personalized paywall *(red-team C2-4; research 01 §C1)*

Opened only from a locked "coach" tap, never at launch. Structure:
- **A header that reflects him back to himself** — name what he told the book in onboarding:
  his focus goal, his danger window, his witness. ("Your danger window is 10–11pm. The coach
  watches it for you.") Personalization beats layout.
- **A two-column ledger split — "In your free book" vs "With the coach"** — so it is
  *structurally impossible* to sell a free feature as paid (the free column visibly includes
  schedule, streaks, sprints, the night page, HELP NOW; the coach column: the AI read, drift
  intelligence, the Sunday review, the re-deal).
- **Annual pushed** ("a year on the book," $3.33/mo effective), monthly present, **trial-length
  as a single string/token** (so 7-day vs 14-day can be A/B tested without a redraw).
- Restore + Privacy + Terms on their own 44px row; Apple auto-renew disclosure keyed to the
  selected plan. Ledger voice: "Your book is yours. The coach is hired."

---

## 16 · Home-Screen widget *(red-team C3-5)*

The book's spine on the home screen, sitting among the glass icons. Design **small and medium**
sizes: manila ground, carbon **"DAYS ON THE BOOK n,"** one seal mark, hairline rule. It is a
retention + acquisition surface — the paper object visible every time he looks at his phone.
(SwiftUI target exists at `ios/App/TelemetryWidget/`; give it the paper treatment or it defaults
to system styling.)

---

## 17 · The intercom — the one warm human voice, with a home *(red-team C1-5)*

At reset, at a second consecutive miss, and the morning after: one warm register — **full-strength
ink, body face (SF Pro), sentence case, never caps, never mono, never semantic color.** Reset:
**"Logged. The clock restarts; the work doesn't."**
Give it a **visual container**: an **un-ruled inset with generous air — the one place on any
screen with no hairline** — so its warmth reads as intentional, a person stepping in, not a
copy mistake. This is the answer to "a ledger can't comfort." Give it real presence.

---

## 18 · Copy in the ledger voice — rename the engineer jargon *(carried item, CONSTITUTION §A2)*

The sync/close-the-day control currently reads "**FINISH DAY · SYNC & REFACTOR**" / "REFACTOR
QUEUED · DECK REBUILDS TOMORROW." A 19-year-old keeping a book does not "refactor" or "sync a
deck" — that's engineer-speak leaking through the metaphor. Recast in the ledger's own voice:
e.g. **"Rule off the day"** / **"Day ruled off — tomorrow's page is set."** (Final copy is
yours to propose; kill "refactor," "sync," and "deck" from any user-facing string.)

---

## 19 · Output wanted (summary — full contract in 05)

High-fidelity screens for all deliverables (390×844) in **Split Book and Carbon** (Lamplight
for night screens 2–4), iOS safe areas respected; the **token CSS** for all three skins + the
`[data-invert]` block; the **six-utility print-chrome kit + the Arc primitive** as copy-paste
CSS; the **seal ceremony** as a timed interaction spec; the **haptic grammar** table; the
**App Store asset set** (6 shots + video storyboard + layered icon); the **AX3 reflow** note
per hero screen; and the **native-boundary** treatments (status bar, native sheet tint, widget).
Format: self-contained HTML preview pages (inline CSS, no external assets) + the token CSS file
— the same shape as the previous handoff, so it integrates file-by-file. **Self-grade against
04-DESIGN-RUBRIC.md before returning.**
