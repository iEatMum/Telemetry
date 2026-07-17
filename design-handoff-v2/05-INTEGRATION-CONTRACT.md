# 05 · INTEGRATION CONTRACT — the exact shape to return
### Telemetry design handoff kit v2 · 2026-07-14

*So the output drops into the React 18 + Vite + Tailwind + Capacitor codebase in one pass.
Token names below are **verified against the shipping `src/index.css`** — use them exactly;
they are the names the app already consumes. Deviating breaks the reskin-is-one-file promise.*

---

## A · Theming mechanism (how the app consumes your tokens)

- `ThemeProvider` sets **`data-theme` on `<html>`** (`document.documentElement`), so `<body>`,
  safe-area gutters, `::selection` and native form controls all inherit. `:root` carries the
  **default (Split Book)**; each theme block is a **complete palette** (never inherits from
  another block — a skin must not half-apply).
- Components reference **semantic Tailwind names** (`bg / surface / ink / accent / pos / neg …`)
  that resolve to these CSS vars. **You edit the token file, not the components.**

Return **one stylesheet** with these exact selectors:

```css
:root,
[data-theme="split_book"] { /* Split Book — light. Also set color-scheme: light */ }
[data-theme="lamplight"]  { /* Lamplight — warm dark */ }
[data-theme="carbon"]     { /* Carbon — cool all-day dark */ }
[data-invert]             { /* per-skin ink-dark inversion; may nest under each theme */ }
```

---

## B · The token list (define every one in each theme block)

**Paper stack:** `--bg` · `--surface` · `--surface-2` · `--line` · `--line-bright`
**Ink:** `--text` (=ink) · `--muted` · `--faint`
**Lane-red (commitment only):** `--accent` · `--accent-deep` · `--accent-ink` · `--accent-glow` (→ transparent)
**External-data semantics:** `--pos` · `--neg` · `--warn` · `--pos-soft` · `--neg-soft` · `--warn-soft`
**Glows (all → `none`/transparent — print does not glow, but components still reference them):**
`--num-glow` · `--pos-glow` · `--neg-glow` · `--warn-glow` · `--text-glow`
**Chrome:** `--led-live` · `--led-local` · `--led-offline` · `--grid` · `--scrim`

**Shared, in `:root` only (not per-theme):**
`--radius-card: 0` · `--radius-control: 6px` · `--pad-card: 16px` · `--gap-widget: 14px` ·
`--gap-stat: 12px` · `--ease: cubic-bezier(0.4,0,0.2,1)` · `--dur-quick: 140ms` ·
`--dur-calm: 280ms` · `--dur-pulse: 1800ms` · `--dur-seal: 1200ms` (keep `--dur-outlast` as a
legacy alias = `--dur-seal`).

Exact hex values for all three skins + the accent guard are in **03 §4**. Split Book must
declare `color-scheme: light`; Carbon/Lamplight `dark`.

---

## C · The print-chrome kit + Arc primitive (return as copy-paste CSS)

Six utilities, each with a one-line usage note, built from borders/pseudo-elements (not
bespoke per-widget art):
`.rule` · `.rule-double` · `.ticks` · `.stamp` · `.slip` · `.field-no`

**One shared Arc primitive** (conic-gradient ring + div ticks) with documented **states:**
`progress` (DeepWork) · `seal-hold` (the 1200ms commit sweep) · `calibration` (onboarding
progress ring) · `gauge` (sentiment). This single primitive must power all four — do not fork
it per surface.

---

## D · Deliverables & format

- **Format:** self-contained **HTML preview pages** (inline CSS, no external assets, system
  font stacks only — no webfont files) **+ the token `.css` file.** Same shape as the previous
  Telemetry handoff so it integrates file-by-file.
- **Screens** (390×844, iOS safe areas: 59pt top, 34pt home indicator), in **Split Book AND
  Carbon**; **Lamplight** for the night screens (2, 3, and the urge/DeepWork inversions):
  the 9 hero screens + Empty/First-Run states + personalized Paywall + Widget + the App Store
  asset set (see 03 §11–16).
- **Per hero screen:** include its **AX3 (large-accessibility) reflow** variant.
- **The seal ceremony:** a **timed interaction spec** (curve, durations, haptic beat, cancel
  behavior, reduced-motion fallback) — not just static frames.
- **A theme switcher** in the gallery page (toggles `data-theme`) so all three skins are
  verifiable from one file.

---

## E · Component states matrix (design every cell where it exists)

| Component | States to show |
|---|---|
| Schedule (heat-sheet) row | pending · done · missed (open graphite circle) · late · high-impact ◆ |
| Checkbox / radio | off · on (detent-fill) · disabled |
| Tab | active (lane-red underline) · inactive |
| Health-link row | linked · not linked · unavailable |
| Guardian card | watch · critical (urgency via weight + ochre rule, **never red**) |
| Seal / commit control | rest · press-sweep · stamp · posted · cancelled-early |
| Sync / "rule off the day" bar | idle ("Rule off the day") · done ("Day ruled off — tomorrow's page is set") |
| Status LED | LIVE · LOCAL ("ON DEVICE") · OFFLINE (calm, never a warning color) |
| Empty states | empty deck · empty WeekGrid · never-run timer · loading · offline |
| Paywall | free-column · coach-column · annual (pushed) · monthly · restore/legal row |

**Component inventory the tokens must cover** (don't design each beyond the screens above):
ScheduleMatrix, KpiGrid, StatRow, BiometricChart, GoalProgress, DeepWorkTimer, InsightCard,
DailyBriefing, EnergyTrendLine, WeekGrid, FaithCard, EmptyState, plus shell: TabBar, NavBar,
StreakClock, UrgeProtocol, WeeklyReview, Onboarding, Sheet/ConfirmSheet, Toast, SettingsSheet,
LiveDeck header. (MarketSentimentWidget was deleted in M2 — do not design it.)

---

## F · Native / Capacitor seams (design notes + the hooks that consume them)

These make the paper feel native (03 §12). Provide the **design**; the values/hooks below tell
eng exactly where it plugs in.

- **Safe areas:** use `env(safe-area-inset-top/bottom/left/right)`. The chrome stack (LED strip
  `pt-safe` · NavBar `pb-safe` · HELP pill · sync bar) must rise together on notched devices.
- **Status bar:** specify content style **per skin** — dark content on Split Book, light on
  Carbon/Lamplight (set via `@capacitor/status-bar`).
- **Haptics (Capacitor Haptics plugin):** map your **haptic grammar (03 §10)** to calls —
  `notification({type:'SUCCESS'})` on the seal stamp frame; `selectionStart/Changed` on
  detents/tabs (optional); **nothing** on miss/reset/slip. Note `.prepare()`/impact-warm-up
  before the seal. Respect the system haptic setting.
- **Native sheets:** StoreKit paywall, iOS share sheet, permission dialogs — specify the **tint
  to the active skin's ink/accent** where the API allows, and the fallback if it doesn't.
- **Scroll:** deck gets native momentum + bounce (iOS webview scroll plugin).
- **`UIDesignRequiresCompatibility`:** **v1 = `YES`** in `Info.plist` (opt out of auto Liquid
  Glass on native controls), documented as **temporary** (removed in Xcode 27). Design native
  surfaces to harmonize with glass for the eventual removal.
- **App icon:** deliver **Icon Composer `.icon`** with 3 layers (manila ground · carbon
  hairline ring · lane-red seal) + **dark and monochrome/tinted variants**; also a flat
  1024² fallback PNG.
- **Widget:** deliver the paper design for the SwiftUI target at `ios/App/TelemetryWidget/`
  (small + medium): manila ground, carbon "DAYS ON THE BOOK n," one seal, hairline rule.
- **App Store assets:** 6 screenshots (6.9" 1320×2868 + 6.5" 1284×2778, portrait) + the
  15–20s preview video storyboard, per 03 §14. Captions high-contrast + OCR-legible.

---

## G · What NOT to touch / port

- Don't invent chrome beyond the **six utilities + one Arc primitive**.
- Don't add webfont files — **system stacks only** (New York = `ui-serif`; SF Pro = system;
  IBM Plex Mono is already bundled/loaded by the app — reference it, don't re-import).
- Don't reintroduce any glow (all glow tokens resolve to `none`).
- Don't design MarketSentimentWidget (deleted) or any deck/refactor/sync jargon (renamed, 03 §18).
- Don't relitigate the ratified decisions listed in `00-START-HERE.md` — flag concerns in a
  note instead.

---

## H · Definition of done (the one-line contract)

> A token `.css` (3 skins + `[data-invert]`, exact names above) · the print-chrome kit + Arc
> primitive as copy-paste CSS · self-contained HTML previews of every deliverable in Split Book
> + Carbon (+ Lamplight nights) with a theme switcher and per-screen AX3 reflow · the seal
> ceremony timed spec · the haptic grammar mapped to Capacitor calls · the native-boundary
> treatments · the App Store asset set + layered icon · and a **filled 04-DESIGN-RUBRIC
> scorecard (Gate PASS, ≥92)** attached to the return.
