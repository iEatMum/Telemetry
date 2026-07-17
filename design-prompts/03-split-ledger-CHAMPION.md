# CLAUDE DESIGN BRIEF — "SPLIT LEDGER" 🏆 Tournament Champion
*(Final form of "Zen Ledger" — won the 6-judge finals at 88.3 mean, top pick of 5/6 judges. This brief supersedes 03-zen-ledger.md and carries the production-synthesis spec.)*

## Product
Telemetry — a paid iOS discipline/accountability app for young men (18–25, "lock in" niche, TikTok funnel → App Store subscription). React + Capacitor. The AI builds the user's daily schedule from an onboarding diagnostic; a "Guardian" engine watches drift and sends one push per day. Design must be expressible as CSS custom-property tokens, and must look exceptional in a 30-second vertical screen recording.

## Design thesis
**The athlete's split book.** Every pro keeps a book — splits, sessions, entries posted in ink. Manila paper, carbon ink, stopwatch-grade mono numerals, hairline rules instead of boxes, and ONE lane-red reserved structurally for the seal of commitment. The timer cockpit and urge screen invert to ink-dark in every skin, so the hero moments read stopwatch, not stationery. A ledger only accrues: a miss is an unposted line — never a stain, never red.

## Color template — production tokens (default skin "Split Book", AA-verified)
- bg `#EDE4CE` (manila) · surface `#F6EFDD` · surface2 `#E2D7BC`
- line `#C9BC9C` · linebright `#AC9F7D`
- ink `#1F1B12` (carbon) · muted `#6B6150` (AA 5.3:1) · faint `#9A8F76`
- accent (lane-red seal) `#C93F22` · accentInk `#F9F3E2`
- pos `#3F6E4E` · neg (oxblood) `#8E3B44` · warn `#8C671A` (AA 4.5:1)

**Skin 2 — "Lamplight"** (vulnerable evening window, dark): bg `#14100A` · surface `#1B160E` · surface2 `#241D12` · line `#3A3222` · linebright `#4E4430` · ink `#E7DCC4` · muted `#9A8D72` · faint `#6E6350` · accent `#B25B41` · accentInk `#201409` · pos `#7FA98B` · neg `#B07680` · warn `#C0985A`

**Skin 3 — "Carbon"** (all-day dark, design co-equal with default): bg `#101214` · surface `#16191C` · surface2 `#1D2125` · line `#2A2F34` · linebright `#3B4249` · ink `#E8E6E1` · muted `#8D9298` · faint `#5F656C` · accent (brick) `#C4553B` · accentInk `#F5EFE6` · pos `#79B48D` · neg `#C97A83` · warn `#CFA25C`

**[data-invert] block (all skins):** DeepWork cockpit + UrgeProtocol re-point the SAME token names to ink-dark values — the private night page / stopwatch inversion.

## Typography
- Display: **New York** (ui-serif; Source Serif 4 OFL fallback) — ceremony copy, WeeklyReview headlines, Guardian marginalia italic ONLY. Widget titles do NOT use it.
- Body: **SF Pro Text** (system) — labels, prose, the intercom voice; 15px/1.5. Widget titles/column heads: 11px uppercase +0.08em, muted.
- Data: **IBM Plex Mono** 400/500, tabular-nums — the stopwatch face: every numeral, time, split, total. 500 at hero sizes (cockpit clock, StreakClock, lifetime totals), never bolder — size and mono/serif contrast carry hierarchy.

## Shape, chrome & motion
De-boxed at the token level: card radius **0** (6px only on tappable controls), surface ≈ bg (one paper step), each card closed by a single bottom hairline. Print-chrome kit of six shared utilities: `.rule`, `.rule-double`, `.ticks`, `.stamp`, `.slip`, `.field-no` — plus ONE shared Arc primitive (conic-gradient ring + div ticks) powering the seal hold-ring, onboarding progress ring, sentiment gauge, and DeepWork progress. Motion, four verbs: **ink-settle** (160ms fade + 2px rise), **breath** (1800ms pulse, running clocks only), **rule-draw** (line/dashoffset sweep; 1200ms for the seal hold), **seal-press** (0.98→1 settle on any commit). No color flashes; reduced-motion collapses all.

## Screens to design (deliverables)
1. **Deck "Today" tab** — a heat sheet: Plex Mono time column reads like lane splits, hairline rule under each row; ◆ = small filled lane-red diamond in the margin (the only accent on the page); done = carbon ink check; missed = open graphite circle ("not posted"), NEVER red. Tab strip: SF Pro 11px caps, active tab = 2px lane-red underline that rule-draws between tabs.
2. **DeepWorkTimer** — idle: blank ruled line "Next entry" + quiet lane-red Start. Running: **inverts to ink-dark in ALL skins** — full-bleed carbon, giant Plex Mono 500 numerals, single breathing lane-red underline. Finished: "Posted." + seal-press.
3. **Urge protocol full-screen** — lamplit ink-dark private night page in every skin; **elapsed time counts UP** (survival framing); lifetime total dominant, current run secondary; hold-to-seal = the Arc primitive sweeping a lane-red seal ring closed → "Entry posted. Urge outlasted — 38 total."
4. **Guardian drift card** — a coach's pencil note in the margin: indented block, 2px ochre left rule, New York italic observation, plain-ink action. "Third late night this week. Protect the wake."
5. **Onboarding node** — "opening your book," intake-with-a-coach voice: serif question heading, rule-draw progress hairline + mono "04/15"; focus-goal radios = ink-fill circles with a 140ms detent fill; health-link checkboxes = ruled rows, square ink ticks.
6. **WeekGrid** — seven ruled cells: completed day = small round lane-red seal-mark; extra sprints accrue as ink tally strokes (gym-chalk); incomplete = blank paper. No streak-break mark exists in the vocabulary.
7. **KpiGrid/StatRow + GoalProgress** — trial-balance strip (hairline columns, small-caps labels, mono figures); GoalProgress = a rule-draw line, not a bar, mono fraction at the right margin, "X to go" near the end.
8. **WeeklyReview (the Sunday page)** — the serif's home: display headline, week's figures as a closed trial balance, one re-commit line ("New week. One change. Go.") sealed with seal-press.
9. **Login/splash + app icon** — manila field, lane-red seal ring stamped center (Arc primitive), TELEMETRY in 11px caps beneath, one mono line. Icon = the lane-red seal ring on manila — legible at 60px, unlike anything neon on the shelf.

## The intercom voice (grafted from Instrument — required)
At reset, second consecutive miss, and the morning after: one warm human register — full-strength ink, body face, sentence case, never caps, never mono, never semantic color. Reset: "Logged. The clock restarts; the work doesn't."

## Binding psychology guardrails (non-negotiable)
- Entries only ACCRUE; a miss is an unposted line — red can never mark it. Lane-red is grammatically reserved for commitment (the seal, Start, ◆).
- Lifetime totals hold the dominant mono position; day-zero is one small line.
- pos/neg tints only on EXTERNAL data (biometrics, conditions) — glyphs on the numeral, no tinted pills.
- No confetti, badges, points, leaderboards, or variable-reward reveals. A posted entry is its own quiet proof.
- FaithCard = the quiet page: double-rule inset, italic scripture, mono reference, zero accent.
- Accent guard: `#C93F22` is 4.3:1 on paper — fills, seals, rules, ◆, and text ≥13px/500 only; never small body text.

## Why it won (context for design decisions)
- Psychologist (92): "the only system whose core metaphor does the psychological work by itself."
- Therapist (92): "a coach's office, not a courtroom" — the coach's margin note is the one warm human presence.
- CEO (88): "a mechanism instead of a mood — the app cannot shame you even if a copywriter tries."
- Podcaster (89): "'Every pro keeps a book' is a five-word pitch; stopwatch-cut-to-manila stops a neon feed cold."
- Developer (78, the one holdout): the de-boxing must stay token-level (radius 0, surface≈bg, bottom hairline) — do NOT invent per-widget chrome beyond the six utilities + Arc primitive.

## Output wanted
High-fidelity screens for all 9 deliverables (390×844) in Split Book AND Carbon skins (Carbon is co-equal, not an afterthought), the token sheet as CSS custom properties for all 3 skins + the [data-invert] block, the print-chrome kit spec (six utilities), and the seal ceremony as a 4-frame interaction spec (rest → press-sweep → stamp → posted).
