# TELEMETRY — Design Handoff Kit v2
### For Claude Design · commissioned by Ian (Co-CEO / lead engineer) · assembled by the lead design architect · 2026-07-14

---

## What this is

The single best package we can hand Claude Design to produce **the definitive visual
design for Telemetry**. It supersedes `design-prompts/HANDOFF-claude-design-split-ledger.md`
as the canonical brief — but it does **not** throw away what won. The reigning champion,
**Split Ledger** (design-prompts/03-split-ledger-CHAMPION.md, 88.3 across the 6-judge
tournament, shipping in `src/index.css` today), stays the direction. Our mandate this
round is narrow and hard:

> **Perfect the champion.** Take Split Ledger from a ratified 88 to a 95+. Harden it,
> close the gaps a fresh expert panel found, and make it unmistakably native in the
> iOS-26 era — without touching the psychology spine that made it win.

## Why now

Between the tournament and today the ground moved. **iOS 26 shipped Liquid Glass, and as
of April 28 2026 every App Store upload must be built against the iOS 26 SDK** (see 01 §A).
That date has already passed — Telemetry cannot submit without reckoning with it. The
current handoff predates all of this and never mentions it. That single gap is the biggest
reason design felt "missing": the brief was excellent for 2025 and silent on 2026.

## The three things Ian is optimizing for (in priority order)

1. **iOS-26 native polish** — feel unmistakably native in the Liquid Glass era: the paper
   world and the system-glass world reconciled deliberately, motion, haptics, safe areas.
2. **Daily-use retention feel** — the 6:45am and 10:15pm app you *want* to open; the seal
   ceremony as the thing that earns the subscription past the trial.
3. **App Store conversion** — the icon, the first two screenshots, the seven seconds where
   a browsing buyer decides. (TikTok virality remains the growth engine but is a lower
   priority this pass, per Ian.)

## ⭐ Build from `TELEMETRY-BUILD-SPEC.md`

After the strategy kit below was written, we walked the **actual shipping code** (every screen,
widget, sheet, and overlay in `src/`) and checked it against the handoff. The result is
**`TELEMETRY-BUILD-SPEC.md`** — the one code-true file Claude Design builds from. It lists every
real surface, the exact gaps to fix (Liquid Glass boundary, un-de-boxed sheets, the perps-era
EnergyTrendLine, CoachGate, jargon, dead components), and the full deliverables list. **Where it
and any file below disagree, the BUILD-SPEC wins — it matches the code.** The five files below
are the *why* behind it.

## The strategy kit (the "why"), and how to read it

| # | File | What it does | Read it when |
|---|---|---|---|
| 01 | `01-RESEARCH-DOSSIER.md` | The 2026 evidence base — Liquid Glass, App Store conversion, retention, the competitive shelf, haptics/motion/type. Every claim cited + confidence-tagged. | First. It's the *why* behind every instruction in 03. |
| 02 | `02-EXPERT-REDTEAM.md` | Three harsh critics (App-Design Director, Growth/ASO Lead, iOS Platform Purist) attack Split Ledger and the old handoff. Findings are severity-tagged; each has a fix. | Second. It's the *what's wrong today* that 03 fixes. |
| 03 | `03-HANDOFF-v2.md` | **The brief.** Self-contained, no repo access needed. Everything Claude Design builds from. Keeps all of Split Ledger; folds in every fix. | This is the one you build from. |
| 04 | `04-DESIGN-RUBRIC.md` | The scorecard. Weighted to the three priorities, with hard-rule auto-fails. **Self-grade against it before you return work.** | Before and after you design. |
| 05 | `05-INTEGRATION-CONTRACT.md` | The exact return shape so output drops into the React + Capacitor codebase in one pass — token names, chrome kit, native seams, file format. | When you're ready to package deliverables. |

## The one rule that overrides everything (do not violate — auto-fail)

Telemetry is a shame-free discipline app whose users include people in recovery. The
psychology is load-bearing and grounded in named studies (`PSYCHOLOGY.md`). **A miss is an
unposted line — never red, never a stain, never a verdict on the person.** Lane-red is
grammatically reserved for *commitment* (the seal, Start, the ◆ high-impact marker). No
confetti, badges, points, leaderboards, streak-loss interstitials, or variable-reward
reveals — ever. If a design decision is beautiful and violates this, the design is wrong.
Every critic in 02 was told this is off the table, and so are you.

## What Claude Design owns vs. what is already decided

- **You own:** the pixels — high-fidelity screens, the token values inside the ratified
  palettes, the seal ceremony, motion, the Liquid Glass reconciliation, the App Store
  asset designs, empty/loading/error states, the icon.
- **Already decided (don't relitigate):** the Split Ledger *direction*; the three skins
  (Split Book / Lamplight / Carbon); the type trio (IBM Plex Mono / New York / SF Pro);
  the generative-widget architecture; the psychology hard-rules; the free-book/paid-coach
  business model. If you think one of these is wrong, say so in a note — don't silently
  redesign around it.

**Build from `TELEMETRY-BUILD-SPEC.md`.** Skim 01 (research) and 02 (red-team) for the reasoning
behind its fixes; use 04 to self-grade and 05 for the exact return format.
