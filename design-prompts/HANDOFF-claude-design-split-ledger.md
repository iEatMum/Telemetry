# CLAUDE DESIGN HANDOFF — TELEMETRY · "SPLIT LEDGER"
*Copy-paste this whole document into Claude Design as the project brief. It is self-contained — no repo access needed. The "Integration contract" section tells you exactly what to return so it drops into the codebase in one pass.*

---

## 1 · Product

**Telemetry** — a paid iOS discipline/accountability app for young men (18–25, "lock in" niche, TikTok funnel → App Store subscription). React + Vite + Tailwind inside a Capacitor 8 WKWebView. The AI builds the user's daily schedule from a 15-node onboarding diagnostic; a "Guardian" engine watches behavioral drift and sends exactly one push notification per day, 30 minutes before the user's vulnerability window.

This is a **full visual redesign** replacing a neon green-on-black "perps terminal" look. The winning direction (picked by a 6-judge design tournament) is below. Two hard platform facts:

- The entire skin must be expressible as **CSS custom-property tokens** — a reskin is one token file. No per-component color literals.
- Every hero screen must look exceptional in a **30-second vertical screen recording** (the TikTok funnel is the growth engine).

## 2 · Design thesis — the athlete's split book

Every pro keeps a book — splits, sessions, entries posted in ink. The app is that book: manila paper, carbon ink, stopwatch-grade mono numerals, hairline rules instead of boxes, and **one lane-red reserved structurally for the seal of commitment**. The timer cockpit and urge screen invert to ink-dark in every skin, so the hero moments read *stopwatch, not stationery*. A ledger only accrues: a miss is an unposted line — never a stain, never red.

The pitch in five words: **"Every pro keeps a book."** The TikTok hook: a full-bleed carbon stopwatch cutting to a manila page stops a neon feed cold.

## 3 · Color tokens (AA-verified — treat as final unless a contrast check fails)

**Skin 1 — "Split Book" (default, light):**
bg `#EDE4CE` (manila) · surface `#F6EFDD` · surface2 `#E2D7BC` · line `#C9BC9C` · linebright `#AC9F7D` · ink `#1F1B12` (carbon) · muted `#6B6150` · faint `#9A8F76` · accent (lane-red seal) `#C93F22` · accentInk `#F9F3E2` · pos `#3F6E4E` · neg (oxblood) `#8E3B44` · warn `#8C671A`

**Skin 2 — "Lamplight" (the vulnerable evening window, dark):**
bg `#14100A` · surface `#1B160E` · surface2 `#241D12` · line `#3A3222` · linebright `#4E4430` · ink `#E7DCC4` · muted `#9A8D72` · faint `#6E6350` · accent `#B25B41` · accentInk `#201409` · pos `#7FA98B` · neg `#B07680` · warn `#C0985A`

**Skin 3 — "Carbon" (all-day dark — design co-equal with Split Book, not an afterthought):**
bg `#101214` · surface `#16191C` · surface2 `#1D2125` · line `#2A2F34` · linebright `#3B4249` · ink `#E8E6E1` · muted `#8D9298` · faint `#5F656C` · accent (brick) `#C4553B` · accentInk `#F5EFE6` · pos `#79B48D` · neg `#C97A83` · warn `#CFA25C`

**`[data-invert]` block (all skins):** the DeepWork cockpit and Urge screen re-point the SAME token names to ink-dark values — full-bleed carbon page, paper-toned ink, breathing lane-red accent. This is the private night page / stopwatch inversion; design its exact values per skin.

**Accent guard:** lane-red `#C93F22` is 4.3:1 on paper — use it for fills, seals, rules, the ◆ marker, and text ≥13px at weight 500 only; never small body text.

## 4 · Typography

- **Display: New York** (iOS `ui-serif`; fallback Source Serif 4, OFL) — ceremony copy, WeeklyReview headlines, Guardian marginalia italic ONLY. Widget titles do NOT use it.
- **Body: SF Pro Text** (system) — labels, prose, and the intercom voice; 15px/1.5. Widget titles / column heads: 11px uppercase, +0.08em tracking, muted.
- **Data: IBM Plex Mono** 400/500, `tabular-nums` — the stopwatch face: every numeral, time, split, and total. 500 at hero sizes (cockpit clock, StreakClock, lifetime totals), never bolder. Hierarchy comes from size and the mono/serif contrast, not weight.

## 5 · Shape, chrome & motion

**De-boxed at the token level:** card radius **0** (6px only on tappable controls), surface ≈ bg (one paper step), each card closed by a single bottom hairline. No drop shadows, no glow, anywhere.

**Print-chrome kit — exactly six shared utilities** (spec each as reusable CSS):
`.rule` (1px hairline) · `.rule-double` (double rule under section heads) · `.ticks` (tick marks) · `.stamp` (seal/stamp treatment) · `.slip` (inset note block) · `.field-no` (mono form-field numbering, e.g. "04/15")

**Plus ONE shared Arc primitive** (conic-gradient ring + div ticks) powering: the seal hold-ring, the onboarding progress ring, the sentiment gauge, and DeepWork progress. Do not invent per-widget chrome beyond these seven pieces — this constraint came from the tournament's developer judge and is binding.

**Motion — four verbs only:** **ink-settle** (160ms fade + 2px rise, list entries) · **breath** (1800ms pulse, running clocks only) · **rule-draw** (line/dash-offset sweep; 1200ms for the seal hold) · **seal-press** (0.98→1 settle on any commit). One ease. No color flashes. `prefers-reduced-motion` collapses all four.

## 6 · Screens to design — 9 deliverables, 390×844, in Split Book AND Carbon

1. **Deck "Today" tab** — a heat sheet: Plex Mono time column reads like lane splits, hairline rule under each row; ◆ = small filled lane-red diamond in the margin (the page's only accent); done = carbon ink check; missed = open graphite circle ("not posted"), NEVER red. Tab strip: SF Pro 11px caps; active tab = 2px lane-red underline that rule-draws between tabs.
2. **DeepWorkTimer** — idle: a blank ruled line labeled "Next entry" + a quiet lane-red Start. Running: **inverts to ink-dark in ALL skins** — full-bleed carbon, giant Plex Mono 500 numerals, a single breathing lane-red underline. Finished: "Posted." + seal-press. No celebration.
3. **Urge protocol full-screen** — the lamplit ink-dark private night page in every skin; **elapsed time counts UP** (survival framing — dive bezels measure survival, not deadline); lifetime total dominant, current run secondary; hold-to-seal = the Arc primitive sweeping a lane-red seal ring closed → "Entry posted. Urge outlasted — 38 total."
4. **Guardian drift card** — a coach's pencil note in the margin: indented block, 2px ochre left rule, New York italic observation, plain-ink action. "Third late night this week. Protect the wake." Ochre at most — never red, never an indictment.
5. **Onboarding node** — "opening your book," intake-with-a-coach voice: serif question heading, rule-draw progress hairline + mono "04/15"; focus-goal radios = ink-fill circles with a 140ms detent fill; health-link checkboxes = ruled rows with square ink ticks (and a disabled/"not linked" state).
6. **WeekGrid** — seven ruled cells: completed day = small round lane-red seal-mark; extra sprints accrue as ink tally strokes (gym-chalk); incomplete = blank paper. **No streak-break mark exists in the vocabulary.**
7. **KpiGrid / StatRow + GoalProgress** — trial-balance strip: hairline column rules, small-caps muted labels, mono figures; GoalProgress = a rule-draw line (not a bar), mono fraction at the right margin, "X to go" near the end.
8. **WeeklyReview — the Sunday page** — the serif's home: display headline, the week's figures as a closed trial balance, one re-commit line ("New week. One change. Go.") sealed with seal-press.
9. **Login/splash + app icon** — manila field, lane-red seal ring stamped center (the Arc primitive), TELEMETRY in 11px caps beneath, one mono line. Icon = the lane-red seal ring on manila — legible at 60px, unlike anything neon on the shelf.

**Also style (secondary, token-level is fine):** FaithCard = the quiet page — double-rule inset, italic scripture, mono reference line, zero accent. Sheet/modal chrome, Toast, TabBar, SettingsSheet theme picker rows.

## 7 · The intercom voice (required surface)

At reset, at a second consecutive miss, and the morning after: one warm human register — full-strength ink, body face, sentence case, never caps, never mono, never semantic color. Reset copy: **"Logged. The clock restarts; the work doesn't."** Give it real visual presence, not a footnote.

## 8 · Binding psychology guardrails (non-negotiable — the tournament's safety spine)

- Entries only **ACCRUE**; a miss is an unposted line — red can never mark it. Lane-red is grammatically reserved for commitment (the seal, Start, ◆). This must hold on every screen: if red appears anywhere a user could read it as a verdict on himself, the screen is wrong.
- Lifetime totals hold the dominant mono position; the day-zero clock is one small line.
- pos/neg tints only on EXTERNAL data (biometrics, market conditions) — ▲▼ glyphs on the numeral, no tinted pills.
- No confetti, badges, points, leaderboards, or variable-reward reveals. A posted entry is its own quiet proof. Completion settles; it never celebrates.

## 9 · Integration contract — what to return, in this exact shape

The codebase themes via `data-theme` on `<html>` (`documentElement`), with `:root` carrying the default. Return:

**A. One token stylesheet** (`tokens.css`) with these exact selectors and variable names — these are the names the app already consumes, plus three new ones (`--line-bright`, `--faint`, `--accent-deep` stays):

```css
:root, [data-theme="split_book"] { /* Split Book values */ }
[data-theme="lamplight"] { /* Lamplight values */ }
[data-theme="carbon"] { /* Carbon values */ }
[data-invert] { /* per-skin inversion — may nest under each theme selector */ }
```

Variables to define in each block:
`--bg` `--surface` `--surface-2` `--line` `--line-bright` `--text` (=ink) `--muted` `--faint` `--accent` `--accent-deep` `--accent-ink` `--pos` `--neg` `--warn` `--pos-soft` `--neg-soft` `--warn-soft` `--led-live` `--led-local` `--led-offline` `--grid` `--scrim`
Plus shared (in `:root` only): `--radius-card: 0` `--radius-control: 6px` `--pad-card` `--gap-widget` `--gap-stat` `--ease` `--dur-quick: 140ms` `--dur-calm: 280ms` `--dur-pulse: 1800ms` `--dur-seal: 1200ms`.
Every glow variable from the old skin (`--num-glow`, `--pos-glow`, `--neg-glow`, `--warn-glow`, `--text-glow`, `--accent-glow`) must be defined as `none`/transparent — components still reference them.
Note: Split Book is the light skin — flag that it needs `color-scheme: light`.

**B. The print-chrome kit** — the six utilities + the Arc primitive as copy-paste CSS (classes + custom properties), each with a one-line usage note.

**C. High-fidelity screens** for all 9 deliverables in **Split Book and Carbon** (Lamplight: hero screens 2–4 only). 390×844, iOS safe areas respected (59pt top notch, 34pt home indicator).

**D. The seal ceremony** as a 4-frame interaction spec: rest → press-sweep (rule-draw, 1200ms) → stamp (seal-press) → posted.

**E. Component states** where they exist: schedule row (pending / done / missed / high-impact ◆), checkbox/radio (off / on / disabled), tab (active / inactive), health-link row (linked / not linked / unavailable), Guardian card (watch / critical — critical may raise urgency through weight and the ochre rule, never through red).

**Format:** self-contained HTML preview pages (inline CSS, no external assets) + the token CSS file — the same shape as the previous Telemetry design handoff, so it can be integrated file-by-file.

**Component inventory the tokens must cover** (for reference — don't design each individually beyond the 9 screens): ScheduleMatrix, KpiGrid, StatRow, BiometricChart, GoalProgress, DeepWorkTimer, InsightCard, DailyBriefing, EnergyTrendLine, MarketSentimentWidget, EmptyState, FaithCard, WeekGrid, plus shell: TabBar, NavBar, StreakClock, UrgeProtocol, WeeklyReview, Onboarding, Sheet/ConfirmSheet, Toast, SettingsSheet, LiveDeck header.

## 10 · Why this direction won (context, not instructions)

- Psychologist (92): "the only system whose core metaphor does the psychological work by itself."
- Therapist (92): "a coach's office, not a courtroom" — the coach's margin note is the one warm human presence.
- CEO (88): "a mechanism instead of a mood — the app cannot shame you even if a copywriter tries."
- Podcaster (89): "'Every pro keeps a book' is a five-word pitch; stopwatch-cut-to-manila stops a neon feed cold."
- Developer (78, the holdout): the de-boxing must stay token-level — do NOT invent per-widget chrome beyond the six utilities + Arc primitive.
