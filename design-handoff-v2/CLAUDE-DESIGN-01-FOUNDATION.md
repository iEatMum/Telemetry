# CLAUDE DESIGN — PACKAGE 1 of 5 · THE FOUNDATION
### Paste this whole file into Claude Design. Self-contained. · Telemetry · 2026-07-14

You are designing **Telemetry**, a paid iOS discipline/accountability app (young men 18–25) with a
manila-paper "athlete's split book" aesthetic — carbon ink, IBM Plex Mono numerals, hairline rules
instead of boxes, and **one lane-red reserved structurally for commitment**. It ships today in React +
Capacitor; the design system already exists (`src/index.css`). This is a targeted elevation, not a
rebuild.

**This package is the shared foundation every other screen reuses**, so it comes first. Four deliverables:
(1) the de-boxed sheet/dialog system, (2) the seal ceremony, (3) the haptic grammar, (4) the native
boundary. Packages 2–5 (hero surfaces, monetization, App Store assets, first-run) build on top of these.

---

## The non-negotiable spine (auto-fail if any is violated)

Users include people in recovery; the psychology is load-bearing.
- **A miss is an unposted line — never red, never a stain, never a verdict on the person.** `--neg`
  (oxblood) is for *external* data only (biometrics), never the person's own record.
- **Lane-red (`--accent`) appears only on commitment** — the seal, Start, the ◆ high-impact marker.
  One lane-red mark per screen, maximum. It can never mark a miss.
- **No confetti, badges, points, leaderboards, streak-loss states, or variable-reward reveals. Ever.**
  Completion settles; it never celebrates.
- The warm human voice ("the intercom") carries every slip moment; HELP + the 988 line are one tap away.

## Tokens you'll use (full list in 05-INTEGRATION-CONTRACT.md; these match the shipping code)

Themed via `data-theme` on `<html>`; `:root` = Split Book default. Three skins, each a complete palette.

- **Split Book** (light default): `--bg #EDE4CE` · `--surface #F6EFDD` · `--surface-2 #E2D7BC` ·
  `--line #C9BC9C` · `--line-bright #AC9F7D` · `--text #1F1B12` · `--muted #6B6150` · `--faint #6C6451` ·
  `--accent #C93F22` · `--accent-deep #A93318` · `--accent-ink #F9F3E2`
- **Carbon** (cool all-day dark, co-equal): `--bg #101214` · `--surface #16191C` · `--surface-2 #1D2125` ·
  `--line #2A2F34` · `--text #E8E6E1` · `--muted #8D9298` · `--accent #C4553B` · `--accent-ink #F5EFE6`
- **Lamplight** (warm evening dark): `--bg #14100A` · `--surface #1B160E` · `--text #E7DCC4` ·
  `--accent #B25B41`
- **`[data-invert]`** — the DeepWork cockpit and night page re-point the same token names to an ink-dark
  family in every skin (values ship in code).
- **Shape:** card radius **0**; `--radius-control: 6px` on tappable controls only; elevation = one paper
  step (`surface` on `bg`) + a single bottom hairline. **No drop shadows, no glow** (all glow tokens = `none`).
- **Type:** IBM Plex Mono 400/500 `tnum` (every numeral/time) · New York `ui-serif` (ceremony, headlines,
  InsightCard italic) · SF Pro (body/labels). Hierarchy from size + mono/serif contrast, never weight > 600.
- **Motion — four verbs only, one ease** (`cubic-bezier(.4,0,.2,1)`): ink-settle (160ms) · breath
  (1800ms, running clocks only) · rule-draw (1200ms, the seal sweep) · seal-press (0.98→1). All collapse
  under `prefers-reduced-motion`. Do **not** add Liquid-Glass fluidity — calm is the brand.

---

## DELIVERABLE 1 — The de-boxed sheet & dialog system

**The problem:** the deck widgets are correctly de-boxed (a `Card` is just `bg-surface` + one bottom
hairline, radius 0), but every **sheet** still carries terminal-era rounding — `rounded-t-3xl`,
`rounded-2xl` sections, `rounded-xl` rows. The moment a user opens Settings or the Sunday Debrief, the
manila-ledger doctrine breaks and it looks like a different, rounder app. Bring the sheets into the system.

Design a **bottom-sheet + dialog shell** and its inner patterns in **Split Book and Carbon**:

- **Sheet chrome** — backdrop scrim, a slim grab affordance, a title (New York for ceremony sheets like the
  Sunday Debrief; SF Pro for utilitarian ones like Settings), a 44×44 ✕. **Decide the lip:** either square
  the top edge (pure ledger) or allow *one* small top radius (~10px) as "the page lifted off the stack" —
  **pick one, state it, and apply it to every sheet.** My recommendation: the small single top radius on the
  sheet's outer lip only, everything inside radius-0 — it reads as a physical page without softening the ledger.
- **Inner section pattern** — replace every `rounded-2xl` bordered box with a **ruled section**: a
  `SectionLabel` (11px caps, muted) over a `.rule` hairline, content, closed by a bottom hairline. Air
  separates sections, not boxes.
- **Row/field patterns** — settings rows, toggles (the ink-fill switch already in Onboarding), the `input`
  field style (border → `--accent-deep` on focus), the two-tap destructive control (Wipe).
- **Component states to show:** sheet (open) · ruled section · text field (idle/focus/disabled) · toggle
  (on/off) · primary button (lane-red, the one commit) · secondary (hairline) · destructive (two-tap armed).

Apply the pattern so it visibly covers: **Sheet (base), SettingsSheet, WeeklyReview (Sunday Debrief),
WellnessSheet, ConfirmSheet.** (Full inventory + real states in TELEMETRY-BUILD-SPEC §3E.)

---

## DELIVERABLE 2 — The seal ceremony (the shared commit interaction)

This is the single most important interaction in the product — it's the retention driver, the App Store
video, and the one bodily moment, and it's **reused on every commit surface**: posting a schedule row,
DeepWork "Posted.", "I stayed" on the night page, "Rule off the day" (the evening seal), and INITIALIZE at
the end of onboarding. Design it **once**, as a timed spec, so every surface pulls the same object.

Built on the shared **Arc primitive** (a conic-gradient ring + tick divs). Four states + the between-frames:

1. **Rest** — a faint, un-stamped lane-red ring; a quiet label ("Hold to seal" / "Hold to log the slip").
2. **Press-sweep** — pointer/Space-Enter down starts a **`rule-draw` sweep filling the ring over 1200ms**.
   **Early release cancels at zero cost** — the ring fades back to rest, no penalty visual. (This is the
   existing `HoldButton` behavior; keyboard holds for the same 1200ms, screen-reader path is a two-step
   "Tap again to confirm.")
3. **Stamp** — at completion the ring closes and **`seal-press` settles it 0.98→1**; the seal mark stamps
   onto the page. **One haptic tap fires on this exact frame** (Deliverable 3).
4. **Posted** — the resting stamped state ("Posted." / "Entry posted. Urge outlasted — 38 total."). No
   confetti — the number is the ceremony.

Deliver: the 4 keyframes + the timing curve + the cancel behavior + the `prefers-reduced-motion` fallback
(cross-fade to stamped, keep the haptic). Show it in Split Book (day) and the `[data-invert]` night family.

---

## DELIVERABLE 3 — The haptic grammar (formalize what already exists)

The code already fires **one soft tick on the hold-to-commit** (`hapticTick()` — "the only sanctioned
haptic"). Extend that discipline into a full grammar that **mirrors the accent rule** — a haptic is earned
exactly like lane-red:

| Moment | Haptic | Note |
|---|---|---|
| **Seal / commit** — post a row, DeepWork "Posted.", "I stayed", INITIALIZE, "Rule off the day" | one `notification-success` tap, on the stamp frame | the physical twin of lane-red |
| **Selection** — onboarding detent, nav/tab change (optional) | lightest selection tick | confirms without shouting |
| **Miss · reset · slip · low-readiness · scroll** | **none** | a buzz on a slip is a bodily verdict — same reason it's never red |

Call `.prepare()` before the seal to kill first-tap latency; respect the system haptic setting. Deliver the
table mapped to Capacitor Haptics calls (05 §F lists the hooks). This is spec, not visual — but it's part
of the ceremony, so it lives here.

---

## DELIVERABLE 4 — The native boundary (make the paper feel native on iOS 26)

iOS 26 shipped Liquid Glass, and every App Store build now uses the iOS 26 SDK. The manila **content** is
safe (Apple reserves glass for the *navigation* layer, not content) — but the surfaces the app doesn't
draw itself now live in the glass world and look foreign if ignored. Design the seam:

- **Status bar** — content style bound **per skin**: dark content on Split Book (manila), light on
  Carbon/Lamplight. Never invisible.
- **Safe areas** — exact: Dynamic Island/notch top, home-indicator bottom (`env(safe-area-inset-*)`). The
  fixed stack (status strip, bottom nav) must clear them.
- **Native sheets** (StoreKit paywall, iOS share sheet, permission prompts) — specify the **tint to the
  active skin's ink/accent** where the API allows, and the fallback when it doesn't, so a warm-manila app
  doesn't hand off to a cold default-glass sheet.
- **Decision (design to it):** v1 sets `UIDesignRequiresCompatibility = YES` (opt out of auto-glass on
  native controls), treated as **temporary** — the flag is removed in Xcode 27. Design the native surfaces
  to *harmonize* with glass so the eventual removal is graceful.

Deliver these as annotated treatment notes + the status-bar/sheet-tint values per skin (eng wires them).

---

## What to return for Package 1

1. Self-contained **HTML previews** (inline CSS, system fonts, a `data-theme` switcher) of: the sheet shell +
   inner section/row/field/toggle/button states; the five real sheets re-skinned de-boxed; the seal ceremony
   4-frame sequence — in **Split Book and Carbon** (Lamplight for the night frames).
2. The **seal ceremony** timed interaction spec (durations, curve, cancel, reduced-motion).
3. The **haptic grammar** table mapped to Capacitor calls.
4. The **native-boundary** treatment notes + per-skin status-bar/sheet-tint values.
5. Any **token additions** needed, in the exact `05-INTEGRATION-CONTRACT.md` var-name shape.
6. A filled **`04-DESIGN-RUBRIC.md`** scorecard (Gate PASS, ≥92) — self-grade before returning.

When this is approved, request **Package 2 — Hero surfaces** (the deck, the DeepWork cockpit, the night
page, the WeekGrid, and the EnergyTrendLine redraw). Full context for all of it: `TELEMETRY-BUILD-SPEC.md`.
