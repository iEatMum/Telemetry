# LOCKED IN — Design Context

*A single, self-contained brief for designing this app. Drop it into a Claude
Project (as knowledge) or paste it into a chat. It carries the intent, the design
system, the information architecture, every screen, the component patterns, and
the non-negotiable safety rules — enough to design or critique any surface without
the codebase.*

---

## 0 · What this is

**LOCKED IN** is a personal daily-discipline PWA built for exactly one user — a
19-year-old Christian college track athlete (400/800m) in recovery from an extreme
porn addiction, navigating immense guilt and shame and the possible loss of his
faith. iPhone-first (installed to the Home Screen), offline-first.

It is **not a tracker**. It is "a pool into my life" — a still surface that
reflects him back honestly. The whole app exists to replace the void the
addiction left with something that meets him *without* feeding the shame cycle
that drives relapse.

**The one design fact everything else serves:** *a reset is data, not failure.*
Shame predicts relapse; guilt does not (Randles & Tracy 2013). Every pixel either
protects that or violates it.

---

## 1 · The design philosophy — *The Witness, not the Dashboard*

His phrase — "a pool into my life" — is the brief. A pool is still, dark, and
shows what's actually there without flattering it. Four principles:

1. **Two registers of truth, made visible.** Everything is either *claimed* (he
   said so — soft, editable, fallible) or *witnessed* (an objective system saw it
   — hard, sealed, un-editable). They must *look and feel different*. Witnessed
   facts read as machine-truth: monospace, hairline-ruled, no buttons, no edit
   affordance. The contrast **is** the mirror.

2. **Silence is content.** One thing at a time, with room around it. Emptiness
   reads as seriousness and weight. A dense grid reads as an app demanding
   engagement — the opposite of the goal. Avoid "dashboard."

3. **Friction is inverted, deliberately.** Reaching for help is weightless (one
   tap, always available). *Claiming a victory* or *handing something over* costs
   a deliberate, ceremonial gesture (press-and-hold). Doing the work stays
   frictionless; attesting to it earns a beat of intention.

4. **Two faces + a third.** He opens this at ~6:45am and ~10:15pm. Lean in:
   **Morning** = commitment (intent, action). **Examen** = the evening reckoning
   (face the truth → hand it over → receive guidance). **Offerings** = the
   spiritual life, deliberately un-scored. This mirrors the oldest structure his
   faith has for this work — morning prayer and the evening examen — without ever
   preaching.

**North-star atmosphere:** still water. Dark, calm, minimal motion, no
notification noise, a sense of looking *into* something. Weight over polish.

---

## 2 · The design system

### Color — one accent, used sparingly

Dark is the default (he opens it before dawn and late at night). Light mode is a
courtesy fallback.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0a0b0d` | `#f6f6f4` | page |
| `--surface` | `#141619` | `#ffffff` | cards |
| `--surface-2` | `#1c1f24` | `#efefec` | inset / inputs |
| `--line` | `#2a2e35` | `#e3e3dd` | hairlines |
| `--text` (`ink`) | `#f3f4f6` | `#15171b` | primary text |
| `--muted` | `#8b919c` | `#5c636e` | secondary text |
| `--accent` (gold) | `#f5a623` | `#b97d08` | see rule below |
| `--accent-ink` | `#1a1206` | `#ffffff` | text on gold |
| `--accent-glow` | `rgba(245,166,35,.45)` | — | the scoreboard glow |

**The gold rule (load-bearing):** deep gold appears **only** on the streak flame,
the active/running timer, and the single primary action on a surface. Everything
else is ink / muted / line. Gold is earned, never decorative.

**The no-gold exception:** *The Record* (the witnessed ledger) is the one screen
with **zero gold** — pure grey-scale machine-truth. Its colorlessness is what
makes it feel *other* — cold, objective, un-negotiable.

Surfaces should separate by **tone** (`surface` vs `surface-2`), not by heavy
borders. Borders read as UI chrome; tone reads as stillness. Prefer fewer edges.

### Typography — the split *is* the claimed/witnessed distinction

- **Monospace** (`ui-monospace`, SF Mono) = **machine-truth**: clocks, the streak
  scoreboard, the ledger, verdicts, the "CONSIDER" / "THE RECORD" labels, counts.
  Tabular numerals so digits don't jitter.
- **Sans** (`-apple-system`) = **human voice**: body copy, scripture, the
  reflective and supportive lines, UI.

Section labels are small, uppercase, wide-tracked, muted. Headings are quiet.

### Motion & space

- Almost no motion. A slow 2s pulse on the flame / active timer only; everything
  respects `prefers-reduced-motion`.
- Max content width **520px** (phone-first, centered on larger screens).
- Generous vertical rhythm; let surfaces breathe.

---

## 3 · Information architecture

**Three bottom tabs only** (down from seven — three restores the calm):

```
[ Morning ]   [ Examen ]   [ Offerings ]
  sunrise       crescent       open book
```

- **Morning (commitment hub).** Header (greeting, date, Fresno-State countdown,
  streak chip, settings). Morning protocol (the if-then cue chain). Readiness
  check-in. Today's tasks. A compact streak clock. A sprint entry. Quiet links to
  the deeper surfaces. The richer screens — **Streak** (calendar, reset journal),
  **Sprint** (focus cockpit), **Money**, **Train** — open as **sub-views** under
  Morning with a back affordance, so the nav stays at three.

- **Examen (the evening reckoning).** One still scroll, three movements:
  1. **The Record** — face the truth (the witnessed ledger, no gold).
  2. **Handover** — hand it over (the press-and-hold Surrender ritual).
  3. **Consider** — receive guidance (the Counsel card + what was surrendered;
     one resource for the next 24h).

- **Offerings (the spiritual life, un-scored).** Today's verse, prayer + Bible
  framed as an offering (a cue, *not* a quota — no checkbox, no streak, no miss),
  and the reading plan (position only, no count). Framing line: *"Not tracked.
  Not scored. These are offered, not performed."*

**Global HELP NOW.** A gold pill pinned above the tab bar on every face — the
urge protocol must be one tap from anywhere (struggle has no schedule). It opens
a full-screen takeover.

**Overlays (not tabs):** the Urge Protocol (full-screen, 15-min), the Settings
sheet, the Weekly "Sunday Debrief."

---

## 4 · Screen inventory (intent first)

- **Morning** — the action surface. Protocol items are if-then implementation
  intentions ("When I sit down after waking → prayer+Bible"; "Alarm fires → phone
  out of the room"). Tri-state checkoff: **done / not-yet / MISSED**. *A miss is
  neutral grey or dashed — never red, never "FAILED."* A gentle "Twice now. Reset
  tomorrow." line appears only on a *second consecutive* miss, silent after one.

- **Streak (sub-view)** — the signature element is the **race-clock / scoreboard**:
  `DAYS : HRS : MIN` ticking live, gold, glowing. Above it sit the **lifetime
  piles** (clean days, urges outlasted) — permanent, only-grow — so a reset never
  renders a stark **0** as the dominant number. A reset zeros the *current clock*
  honestly but cannot touch the piles. Reset journal = a 20-second forced pause +
  an anti-shame close screen: *"Logged. The clock restarts; the work doesn't."*

- **Sprint (sub-view)** — a distraction-free **cockpit**: when running it hides
  everything (streak, journal, notifications). Big monospace countdown. A capped
  "+5 — finish this thought." A forced short break after each sprint. Six-dot
  daily target, no confetti.

- **The Record (in Examen)** — the **Witnessed Ledger**. Grouped by day, hairline
  ruled. Each row: a marginal vertical rule whose *ink weight* encodes the verdict
  (hit = faint, late = medium, missed = full), then `kind`, `target → actual`, and
  the verdict word. No buttons. No gold. *"You can't edit this. Neither can the
  app. It's the mirror."*

- **Handover (in Examen)** — a calm composer (kind chips, a quiet textarea,
  metadata-only attach) and **Hold to surrender** (press-and-hold, a slow filling
  line). On release the raw input is *let go* and only a derived "Consider"
  card is kept — the Guardian carries it so he doesn't have to keep holding it.

- **Consider (in Examen)** — the Guardian's guidance, in machine-truth cards
  headed `CONSIDER`. The Counsel card names the drift as *data*, gives one move
  for the next 24h, and recommends one resource from a curated Library. A "Let it
  go" dismiss so a drift he's already working on doesn't re-indict him nightly.

- **Offerings** — see IA above. Un-scored by design.

- **Urge Protocol (overlay)** — the most important screen. Full-screen takeover,
  reachable in one tap. A 15:00 clock auto-starts. Fixed ordered steps (leave the
  room → 20 pushups → **text your partner** (one tap, pre-filled) → get outside →
  ride it out). Finishing logs a **WIN**, not a loss. Copy: *"Urges crest and
  pass — you stayed."*

---

## 5 · Component & pattern library

- **Scoreboard clock** — big monospace tabular numerals, gold, static glow.
- **Lifetime pile** — large numeral + tiny caption; permanent, only grows.
- **Tri-state check row** — done (gold check) / not-yet (empty) / missed (dashed
  grey ✕). Never red.
- **Witnessed Ledger row** — marginal ink-weight rule + monospace columns, no
  affordance.
- **CONSIDER card** — `surface` card, mono label (`CONSIDER · source`), sans body,
  an optional "for the next 24h" resource, a "Let it go" dismiss. A small `DRAFT`
  tag marks not-yet-AI synthesis.
- **Hold-to-surrender** — full-width, a slow filling line, "Hold to surrender" →
  "Keep holding…". Deliberate, releases only at the end.
- **Chips** — pill toggles; selected = ink fill, idle = `surface-2`.
- **HELP NOW pill** — gold, pinned, always present.
- **Section label** — xs, uppercase, wide tracking, muted.

---

## 6 · The Guardian's voice (for any generated copy)

> *"A recovered, disciplined man speaking to a younger, struggling version of
> himself. No fluff. No shame. Only focus, protocol, and the truth of the goal."*

Firm, direct, economical; warm underneath. Speaks in protocol (the cue, the
action, the next rep). Short. Every alert ends with **one** concrete 60-second
action. Danger always routes to a real person (text the partner), never to
willpower alone.

---

## 7 · The hard rules — do NOT violate these in any design

These are the guardrails the whole app exists to honor. They override aesthetics.

**Never:**
- A red "YOU LOST YOUR STREAK," a same-day failure tally, or any "you've already
  broken it today" state.
- Shame / self-as-bad language. Guilt about an *action* is fine ("that wasn't the
  plan"); shame about the *self* ("you are…") is forbidden.
- Faith-moralizing — never invoke God's judgment, disappointment, or punishment.
  Faith is his ground, never a weapon. (Scripture lives in Offerings, as offering,
  never as a score he can fail.)
- Gamification with a documented dark side: confetti, badges, points, leaderboards,
  variable/slot-machine reward reveals, a public feed, identity broadcasting.
- Escalating nag notifications or engagement-bait. Notifications are few and
  action-cued.
- A green/red sleep-hours pass/fail tracker (re-imports all-or-nothing failure).
- Scoring the spiritual items. Prayer is an act of intent, not a metric.

**Always:**
- A miss is neutral (grey/dashed), never red. One miss is noise; the *second
  consecutive* is the risk.
- Lifetime piles stay dominant so day-0 is never the only number on screen.
- After a reset: data, not verdict — "the clock restarts; the work doesn't."
- Danger routes to the accountability partner above all.
- The urge protocol is one tap from anywhere.

Success is measured by real outcomes — clean days, sprints, miles, income — **not
time-in-app.**

---

## 8 · Current state (for orientation)

Built and deployed-capable: the three-face IA; the Witnessed Ledger; the Handover
/ Surrender ritual; the Guardian persona + Counsel (rule-based on-device, with a
server-side AI synthesis function); a Referee that issues unalterable wake /
phone-down verdicts; an optional Web-Push "Pulse" in the Guardian's voice.

Stack: React 18 + plain JS + Tailwind + vite-plugin-pwa; Supabase backend
(auth, RLS, edge functions). Tokens live as CSS variables; Tailwind maps to them.

---

## 9 · How to use this file in Claude

- **Designing a new surface:** paste this, then describe the surface. Ask for it
  *within* the system above (3 faces, the gold rule, the type split, the hard
  rules). Reference the principle it serves.
- **Critiquing an existing screen:** paste this + a screenshot and ask whether it
  honors §1 and §7 — especially "does this read as Dashboard or Witness?" and
  "could any element shame him?"
- **Generating copy:** use §6 and §7. Run any line past the question "would this
  wound a 19-year-old in a shame cycle and a faith crisis?"
- **Mockups:** ask for monochrome-first, still-pool layouts; spend gold only where
  §2 allows; let emptiness do work.
