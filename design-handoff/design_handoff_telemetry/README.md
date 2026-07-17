# Handoff: Telemetry — Generative Widget Kit & App Shell

## Overview
**Telemetry** is an iOS-first daily-discipline app with a "perps trading terminal" aesthetic: near-black surfaces, hairline borders, sharp corners, monospace numerals with a subtle glow, strict green-up/red-down semantics. The user reads his own life as a market — but the market obeys therapeutic rules (see *Behavioral rules*, which override aesthetics).

**This is NOT a set of bespoke screens.** The app is a server-driven / generative UI: the backend forges a JSON tree of allow-listed widgets, and the client renders it into tabs. TODAY / TRENDS / MIND are *tab compositions*, not fixed navigation. The deliverable is therefore:

1. A **design-token system** with 3 themes (`terminal`, `zen`, `night_ops`)
2. **6 primitives** + **11 widgets** with strict prop contracts (these map 1:1 to the app's render registry)
3. A **WidgetHost** dispatcher (`{ type, props }` → widget)
4. **App shell chrome**: status strip, generative tab strip, HELP NOW pill, Sync & Refactor bar, OUTLAST IT full-screen override
5. Four assembled **screens** at full device frame (390×844)

Doctrinal parent: the **LOCKED IN** design system (a calm, shame-free discipline app for a user in recovery). Telemetry is a sibling *skin* over the same psychology and intentionally ships its own tokens. `Telemetry Architecture Spec.dc.html` (included) contains the binding rulings R1–R8 that reconcile the terminal aesthetic with the psychological hard rules — **read it before building**.

## About the Design Files
The files in this bundle are **design references created in HTML** ("Design Components" — each `*.dc.html` opens directly in a browser). They are prototypes showing intended look and behavior, **not production code to copy directly**. Your task is to **recreate these designs in the target codebase's existing environment** — per the architecture spec, that is a **React 18 + Capacitor** shell — using its established patterns and libraries. If no environment exists yet, React + Capacitor (iOS) is the intended stack.

Implementation notes for the recreation:
- Each widget must be registered in a **render registry** keyed by `type` string, receiving `props` from server JSON. The client never branches on user profile — deck ordering is server-side.
- Styling in the prototypes is inline; in production, bind to the CSS custom properties in `telemetry/telemetry.css` (tokens are the contract, inline values are not).
- Theme switching = setting `data-theme="terminal" | "zen" | "night_ops"` on a root element; every token cascades from that attribute.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, glows, motion timings, and copy are final and should be recreated pixel-perfectly. Exact values are listed below and in `telemetry/tokens/*.css`. Interactions (timer, hold-to-surrender, tab switching, sync states) are working in the prototypes and define intended behavior precisely.

## Design Tokens

All tokens are CSS custom properties. **Use these exact variable names.** Source of truth: `telemetry/telemetry.css` (single bundle; granular sources in `telemetry/tokens/`).

### Colors — `terminal` (default, `:root`)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#05070a` | device page |
| `--surface` | `#0a0e13` | widget cards |
| `--surface-2` | `#10161d` | insets / inputs / tracks |
| `--line` | `#1b232c` | hairline borders (1px) |
| `--text` | `#d4dde3` | primary text |
| `--muted` | `#66727d` | labels / secondary |
| `--accent` | `#16f08b` | the one electric green |
| `--accent-deep` | `#0b9a58` | pressed / accent borders |
| `--accent-ink` | `#04160d` | text ON accent fills |
| `--accent-glow` | `rgba(22,240,139,0.45)` | glow color |
| `--pos` / `--neg` / `--warn` | `#16f08b` / `#ff495f` / `#ffb224` | strict market direction |
| `--pos-soft` / `--neg-soft` / `--warn-soft` | same hues at 12% alpha | tints |
| `--num-glow` | `0 0 10px rgba(22,240,139,.30)` | numeral text-shadow |
| `--pos-glow` / `--neg-glow` / `--warn-glow` | `0 0 10px` at .32/.30/.28 | direction glows |
| `--text-glow` | `0 0 12px rgba(180,210,195,.06)` | faint big-numeral haze |
| `--led-live` / `--led-local` / `--led-offline` | pos / warn / muted | status LEDs |
| `--grid` | `rgba(255,255,255,.045)` | chart gridlines |
| `--scrim` | `rgba(0,0,0,.72)` | overlay scrim |

### Colors — `zen` (`[data-theme="zen"]`) — calm light, glow OFF, more air
`--bg #e9ede8 · --surface #f7f9f5 · --surface-2 #edf1ea · --line #d5ddd2 · --text #1b2a22 · --muted #6a7770 · --accent #0b9c5a · --accent-deep #077a45 · --accent-ink #ffffff · --pos #0b9c5a · --neg #d33b4e · --warn #b7790a` · **all glow tokens = `none`** · spacing overrides: `--pad-card 18px, --gap-widget 16px, --gap-stat 14px`

### Colors — `night_ops` (`[data-theme="night_ops"]`) — muted after-hours, glow LOW
`--bg #0b0d10 · --surface #12151a · --surface-2 #181c22 · --line #242b33 · --text #aab4bd · --muted #59626c · --accent #5fbf92 · --accent-deep #3f8a68 · --accent-ink #06120b · --pos #5fbf92 · --neg #c76b76 · --warn #c79a52` · glows at 8px / .12–.14 alpha; `--warn-glow: none`

### Typography
- `--font-clock`: `ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Mono", "Roboto Mono", monospace` + **`font-variant-numeric: tabular-nums`**. Used for: ALL numerals, times, tickers, section labels, verdicts — "machine truth".
- `--font-sans`: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`. Used for: prose, notes, counsel — "human voice".
- **No webfonts** — system-native is intentional (the terminal is the platform).
- Scale: `--t-label 10 · --t-xs 11 · --t-sm 12 · --t-base 13 · --t-md 15 · --t-lg 19 · --t-xl 24 · --t-2xl 32 · --t-clock 40 · --t-hero 46` (px)
- Tracking: `--track-label 0.16em` (uppercase machine labels) · `--track-wide 0.08em` · `--track-mono 0.01em`
- Weights: 400 / 500 / 600. Line-heights: 1.05 / 1.28 / 1.5.
- **SectionLabel pattern**: 10px, uppercase, `letter-spacing .16em`, `--muted`, font-clock.

### Spacing / radius / layout
- Radii (sharp, terminal): `3 / 4 / 5 / 6 / 8 / 10` px + pill `999`. Cards use 6px; markers 4px; bars 3px.
- Space scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40` px.
- `--pad-card 14px` · `--gap-widget 12px` (between widgets in a deck) · `--gap-stat 10px`.
- Layout: design at **390×844**; content canvas **max-width 520px, centered**; page padding 16px.
- iOS safe areas: `env(safe-area-inset-top, 50px)` / `env(safe-area-inset-bottom, 34px)`; tab strip 46px; sync bar 52px.
- Borders: 1px `--line` hairlines. Elevation comes from surface tone steps + hairlines, not drop shadows.

### Motion
- `--ease: cubic-bezier(0.4, 0, 0.2, 1)` — calm, no overshoot, no bounce.
- Durations: `--dur-quick 140ms` (taps, toggles, tab switch) · `--dur-calm 280ms` (sheets/overlays) · `--dur-pulse 1800ms` (LED pulse + timer breath) · `--dur-outlast 1200ms` (hold-to-surrender sweep).
- Keyframes: `tl-led` (LED opacity 1→.5 + box-shadow pulse), `tl-breathe` (opacity 1→.72, running clocks only), `tl-blink` (steps(2), sparing).
- **Motion ceiling**: LED pulse, timer breath, and the two hold sweeps are the ONLY animations. Everything respects `prefers-reduced-motion`.

## Widget Registry — prop contracts

These contracts map 1:1 to the app's render registry. `tone` values are `"pos" | "neg" | "warn" | "muted" | "accent"` unless stated. Every widget is a `--surface` card, 1px `--line` border, 6px radius, 14px padding.

1. **DailyBriefing** — `{ date?, stats:[{label, value, tone}], drivers:[{tone, text}] }`. Stats render as flex cells (1px gap on `--line`, `--surface-2` fill, 20px mono values, tone color + glow). Each driver renders as an **"AI:"** line — 10px mono `AI:` prefix in tone color + 13px sans text.
2. **ScheduleMatrix** — `{ title?, rows:[{ time:"HH:MM", block, status:"hit"|"done"|"late"|"missed"|"open"|"skip", impact?:"high", delta?:{value, dir, suffix?} }] }`. Row: 20px status marker → 44px mono time → block name → optional ◆ (accent, 9px) for high impact → optional DeltaTag. Header shows `n/total EXEC` summary. Status semantics: hit/done = accent-filled check (glowing); late = solid `--warn` border box + warn dash, time in warn; missed = **dashed `--muted` box + muted ✕, muted text — NEVER red**; open = empty `--surface-2` box; skip = muted dash only.
3. **DeepWorkTimer** — `{ label, minutes, at?:"HH:MM", highImpact?, note? }`. The day's anchor block. 46px mono countdown `MM:SS` in accent with 16px glow; `◆ HIGH IMPACT` chip (9px mono, accent-deep border); 4px progress bar; primary Start/Pause/Resume button (accent fill, `--accent-ink` text) + Reset (surface-2). Countdown breathes (`tl-breathe`) while running.
4. **GoalProgress** — `{ title?, items:[{label, value, max, right?, tone?}] }`. Each item: 13px sans label + 12px mono right-value, then a 6px BarMeter.
5. **KpiGrid** — `{ title?, cols?, items:[{label, value, unit?, delta?, deltaSuffix?, spark?:number[], sparkTone?, accent?}] }`. Grid of `--surface-2` cells: 10px mono label, 22px mono value (accent color + glow when `accent:true`), DeltaTag + right-aligned 58×20 sparkline.
6. **StatRow** — `{ title?, cols?, items:[{label, value, delta?, deltaSuffix?, accent?}] }`. Segmented row (1px `--line` gaps): 10px label / 19px mono value / DeltaTag. Doubles as the **lifetime-piles row** (accent on the headline pile).
7. **BiometricChart** — `{ label, value?, unit?, delta?, tone?, data:number[] }`. Header: label + 24px value + unit + DeltaTag. Body: 84px-tall SVG area chart — tone-colored 1.7px line (`vector-effect: non-scaling-stroke`), gradient fill fading to transparent, drop-shadow glow.
8. **EnergyTrendLine** — `{ label?, unit?, points:[{t,v}], now?, open?, avg?, ticks?, caption? }`. Header right: `OPEN n · NOW n (accent) · AVG n` in 10px mono. 96px chart: accent line + `--pos-soft` area + dashed avg baseline + a 9px accent **NOW dot** (2px `--surface` ring) positioned on the `now` point. Tick row beneath; optional muted caption.
9. **MarketSentimentWidget** — `{ label?, status?, sentiment:{score:0..100}, tickers:[{symbol, last, changePct, focus?}] }`. "Internal Markets": StatusLED top-right; sentiment gauge = 8px pill with `--neg → --warn (52%) → --pos` gradient + 2px `--text` needle at `score%`, `BEARISH / BULLISH` end labels; zone label ≥60 BULLISH (pos) / ≤40 BEARISH (neg) / else NEUTRAL (warn). Ticker rows: mono symbol (◆ + accent + `--surface-2` row bg when `focus`), muted last value, DeltaTag `%`.
10. **InsightCard** — `{ heading?, source?, text, tone?:"accent"|"warn"|"neg" }`. The AI "Counsel" readout: header row (LED dot in tone + 11px uppercase heading in tone color/glow + muted source tag) over a 1px rule, then 15px sans body at 1.5 line-height.
11. **EmptyState** — `{ label?, hint? }`. No-data: dashed `--line` border, muted dot + `NO SIGNAL` (12px mono, .22em), dashed flat sparkline SVG, muted hint. Calm — silence is content, not an error.

### Primitives
- **DeltaTag** `{ value, dir?:"auto"|"up"|"down"|"flat", suffix? }` — ▲ `--pos` / ▼ `--neg` / ▬ `--muted`, 13px mono tabular, auto-sign from value, direction glows.
- **Sparkline** `{ data:number[], tone?, width?:96, height?:26 }` — 1.6px polyline + 1.9r end dot, drop-shadow glow.
- **BarMeter** `{ value, max, tone?, height?:6 }` — `--surface-2` track, tone fill + 8px glow, `width var(--dur-calm)` transition.
- **TriStateBox** `{ status:"done"|"missed"|"open" }` — 22px box, 4px radius: done = accent fill + `--accent-ink` check + glow; missed = 1.5px **dashed** `--muted` + muted ✕; open = `--surface-2` + `--line`.
- **Chip** `{ label, active?, onToggle? }` — pill toggle: ON = `--pos-soft` fill, `--accent-deep` border, accent text + glowing 5px dot; OFF = `--surface-2` + `--line` + muted. 11px mono uppercase.
- **StatusLED** `{ status:"LIVE"|"LOCAL"|"OFFLINE", label?, tone? }` — 7px dot + glow, pulses (`tl-led`) unless OFFLINE; 11px mono uppercase label.

## Screens / Views

All at 390×844 inside an iPhone frame (48px corner radius, notch, home indicator). Deck = vertical stack, 12px gaps, 12px side padding, 150px bottom padding (clears sync bar + HELP NOW).

- **TODAY** (terminal, 06:14, LIVE): DailyBriefing → ScheduleMatrix → DeepWorkTimer → GoalProgress.
- **TRENDS** (terminal, 12:40): KpiGrid ("This Week", 2 cols) → StatRow → EnergyTrendLine → MarketSentimentWidget.
- **MIND** (night_ops, 21:52, sync **queued**): InsightCard (accent Counsel) → InsightCard (warn, `GUARDIAN · WATCH`) → StatRow "Lifetime — the piles" (Outlasted 128 accent / Clean days 463 / Days sealed 62).
- **TRENDS empty** (zen, 07:02, LOCAL): single EmptyState — awaiting first sync.

## Shell Chrome & Overlays

- **StatusStrip** `{ status, clock }` — fixed top inside safe area (16px top padding): StatusLED (LOCAL=warn, LIVE=pos, OFFLINE=muted) left; signal bars + mono clock right. Connectivity truth ONLY — never guardian severity.
- **TabStrip** `{ tabs:[{id,label}], active?, onSelect?, showGear? }` — sticky below status strip; horizontally scrollable (scrollbar hidden); 12px mono uppercase `.16em`; active = `--text` + **2px `--accent` underline**; inactive = `--muted`; ≥44px tap height. Settings gear 44×44 at right, below the notch.
- **HelpNowPill** `{ onPress }` — accent pill (999 radius), shield icon + "HELP NOW", 12px mono uppercase 600, `--accent-ink` text, accent glow + drop shadow. Floats bottom-right, 14px from edge, above the sync bar. Opens OUTLAST IT in one tap from anywhere.
- **SyncBar** `{ state:"idle"|"queued", onPress }` — pinned bottom (30px from bottom edge, above home indicator) over a `linear-gradient(to top, var(--bg) 62%, transparent)` protection fade. Idle: `◢ FINISH DAY · SYNC & REFACTOR` — surface fill, line border, accent ◢ glyph. Queued: `✓ REFACTOR QUEUED · DECK REBUILDS TOMORROW` — accent text + `--accent-deep` border + inset accent glow. One seal per day; reopening shows queued state, never a second ask.
- **OutlastModal** `{ minutes?:15, voiceLine?, outlastedCount?, onClose(result) }` — full-screen behavioral override, **always night_ops-calm regardless of app theme**. Layout: `● OUTLAST IT` header + `URGE PROTOCOL` tag → 64px breathing countdown (auto-starts at 15:00) → muted voice line → 5 protocol steps as 48px rows, tappable strictly in order (current = `--surface-2` + `--accent-deep` border + `NOW`; done = muted + accent check): *Leave the room / 20 pushups / Text your partner / Get outside / Ride it out* → primary accent button **"I stayed — close this"** → hold-to-surrender bar.
  - **Hold-to-surrender**: pointer-down starts a `--surface-2` fill sweeping L→R over **1200ms**; release before completion cancels at zero cost; completing → "slipped" close. Muted styling — not red, not accent. *Staying costs nothing; surrendering costs 1.2 deliberate seconds.*
  - **Stayed close**: `POSITION HELD` + lifetime pile **+1** (56px accent glow numeral) + "Urges crest and pass — you stayed." No confetti — the number climbing is the ceremony.
  - **Slipped close** (one voice, all profiles): `POSITION CLOSED · DATA LOGGED` + lifetime pile in plain `--text` + `STILL YOURS` + *"Logged. The clock restarts; the work does not."* **No red anywhere on this screen.**

## Interactions & Behavior
- **Tab switch**: instant content swap (140ms ok), underline moves; deck scroll position resets.
- **DeepWorkTimer**: Start → 1s interval countdown; Pause/Resume; Reset returns to `minutes`. Progress bar `transition: width 1s linear`. Breath animation only while running.
- **Ticker/focus rows**: `--surface-2` row highlight, no hover dependence (touch-first). All tap targets ≥44px.
- Press states: subtle settle/opacity — no shrink-bounce, no color flash.
- **Loading/no-data**: EmptyState widget; LED shows LOCAL when unsynced.

## State Management
- `theme`: `"terminal" | "zen" | "night_ops"` — user setting; manual switching only (the forge may *offer* night_ops in the evening once, never auto-switch).
- `deck`: per-tab JSON `[{ type, props }]` from server; client renders via registry, profile-blind.
- `tab`: active tab id; tabs list itself is server-ordered (extra forged tabs, e.g. Sunday REVIEW, may appear).
- `timer`: `{ running, remaining }` local; `outlast`: phase machine `active → stayed | slipped` + `stepDone` index + `hold` progress 0–1.
- `sync`: `idle | queued`, one transition per day; `led`: LIVE / LOCAL / OFFLINE from connectivity.

## Behavioral rules (override aesthetics — from the Architecture Spec, R1–R8)
1. **Accent scarcity**: `--accent` *fills/glows* appear only on the day's anchor (DeepWorkTimer), the single primary action per surface, the active tab underline, and HELP NOW. Green as market *direction* (`--pos`) may appear wherever data moves up.
2. **`--neg` is weather, not verdict**: legal only on external-condition measures (screen time up, HRV down). Forbidden on: missed schedule rows, streak numbers, the post-slip close, any sentence about the person. A miss is **muted + dashed**, never red.
3. **Faith/recovery content is opt-in** and never scored — no tickers, bars, or verdicts on spiritual items (MIND-only un-scored card; see Proposed Additions).
4. **Day-0 override**: after a reset the server promotes the lifetime StatRow to deck slot 1 for 48h — zero is never the dominant numeral. Post-slip copy is one voice for all profiles.
5. **One notification per app-day**, no app-icon badges, no push escalation. Severity shifts copy register, never volume.
6. Voice: **data, not verdict** — the app never shames the user.

## Assets
None required. All iconography is inline stroke SVG (check, ✕, gear, shield, signal bars) drawn in the prototypes; glyphs ◆ ▲ ▼ ▬ ◢ are unicode text. Fonts are system-native (SF Mono / SF Pro via CSS stacks) — **no webfont files, no images**. The device bezel in screens is presentation-only; do not implement it.

## Files
Open `telemetry/Telemetry Design System.dc.html` in a browser for the full annotated gallery (foundations / widgets / screens / chrome, with a live theme switcher).

- `telemetry/telemetry.css` — **token source of truth** (single bundle; granular: `telemetry/tokens/{colors,typography,spacing,motion,base}.css`)
- `telemetry/Telemetry Design System.dc.html` — annotated gallery of everything
- `telemetry/TelemetryApp.dc.html` — full app shell composition (frame, safe areas, tabs, deck, overlays)
- `telemetry/WidgetHost.dc.html` — the registry dispatcher pattern
- Widgets: `DailyBriefing / ScheduleMatrix / DeepWorkTimer / GoalProgress / KpiGrid / StatRow / BiometricChart / EnergyTrendLine / MarketSentimentWidget / InsightCard / EmptyState` (`telemetry/*.dc.html`)
- Primitives: `DeltaTag / Sparkline / BarMeter / TriStateBox / Chip / StatusLED`
- Chrome: `StatusStrip / TabStrip / SyncBar / HelpNowPill / OutlastModal`
- `Telemetry Architecture Spec.dc.html` — **binding design rulings R1–R8**, system map, profile-adaptive composition, theme×register matrix, widget↔engine bindings, polish punch list
- `Telemetry Proposed Additions.dc.html` — 12 approved-pending gaps (ConfirmSheet/hold-to-seal, PartnerPingRow, SettingsSheet, FaithCard, REVIEW tab, day-0 preset…) with draft contracts
- `support.js`, `doc-page.js` — prototype runtime only; **not part of the design**, do not port.
