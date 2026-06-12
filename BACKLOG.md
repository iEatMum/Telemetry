# LOCKED IN — Backlog (Phase 2 & 3 notes)

Ideas parked here until they're ready. **Rule still stands:** don't start Phase 2
until Phase 1's DoD is met (it's on the home screen + one full real day used).

Legend: `[easy]` small change · `[schema]` touches the data model in storage.js ·
`[backend]` needs Phase 3 Supabase · `[native]` needs a Capacitor wrapper ·
⚠️ platform reality-check · 🔶 a decision you need to make.

---

## ✅ Shipped in Phase 2

- Money (goal, $/day pace, run-rate projection, income log, per-source totals, the "pile")
- Train (session log + auto-pace, shoe tracker, warm-up checkbox, weekly mileage,
  last-4-weeks bars, >15% jump flag, Fresno State countdown)
- Recurring task engine (seeded tasks, due-only surfacing, recurrence + categories)
- Weekly review → "Sunday Debrief" (auto-stats + good/bad questions + last week's one-change)
- Full Settings (multi-partner list, shoes, money goal, bedtime, report date, wipe-all)
- Ian's asks: **missed/failed state** (tri-state checklist), **multi-person HELP button**,
  **weekly good/bad report**, **reading assignment** (John 1–21 plan, extendable)

**Still parked** (mostly Phase-1 polish + Phase-3 backend): HALT check, 3-sec hold-to-reset,
urge timeline, +5 flow extension, sprint stacking, RPE-vs-pace auto-note, the 🔶 color
decision, and the whole auto-accountability layer (§6).

---

## ★ Ian's direct asks (top of the list)

1. **A "failed / missed" option.** `[schema]` Right now a checklist item is just
   done / not-done. Add an explicit **missed** state so a slip is *logged as data*,
   not left blank (stays on-brand: "a reset is data, not failure"). This is also the
   hook for Phase 3 accountability — a "miss" event is what triggers a nudge / a text
   to your partner.
2. **Weekly report: what I did good & bad.** `[medium]` Becomes the core of the
   weekly review — auto-surface the week's wins (clean days, sprints, miles, money)
   and the misses (skipped wakes, blown bedtimes, low-RPE weeks), pulled from the
   data, not retyped. (See "Sunday Debrief" below.)
3. **Reading/listening assignment.** `[schema]` The app assigns the next section to
   read or listen to — a Bible reading plan and/or a book you're working through —
   and you check it off. ("Listen" = a deep-link out to your audiobook app; we track
   the plan + progress, we don't host audio.)
4. **More people on the HELP button.** `[schema]` Move from one accountability partner
   to a **list**. HELP NOW lets you pick who to text (or texts all of them). Clean
   schema change — `settings.partners[]` instead of `partnerName`/`partnerPhone`.

---

## 1. Streak & Urge Protocol

- **HALT check-in** `[easy]` — during the urge protocol and the reset journal, ask:
  **H**ungry / **A**ngry / **L**onely / **T**ired? Store it on the reset/urge record.
  Most slips are misread fatigue or boredom; naming it is the intervention. **High value, cheap — do early.**
- **3-second press-and-hold to confirm a reset** `[easy]` — replace the tap with a
  hold (the prefrontal-cortex speed-bump). Pairs with the existing 20s gate. **Good.**
- **Urge / reset timeline** `[easy]` — a quiet line chart of *when* urges and resets
  happen. If there's a spike at 10:30pm Thursdays, you adapt before Thursday. Builds
  on the pattern readout already in the app.
- ⚠️ **Haptic buzz on HELP NOW** — **won't work in a PWA on iPhone.** iOS Safari
  doesn't support the web Vibration API at all (Android does). The *full-screen
  visual takeover* already fires. Real haptics need the `[native]` wrapper later
  (there's a narrow iOS "switch" haptic trick we could test, but it's hacky).

## 2. Training (400/800 specific)

- **Shoe mileage tracker** `[schema]` — name your spikes/trainers in Settings, tag
  each run with the shoe, sum mileage. Catches breakdown before it becomes shin
  splints heading into the season.
- **Warm-up checkbox** `[easy]` — toggle "dynamic warm-up done" (A-skips, B-skips,
  leg swings) on the training log so you don't cut corners on base miles.
- **RPE vs. pace note** `[medium]` — in the Sunday review, if effort was high but
  pace was slow all week: "High effort, lower pace — prioritize sleep + hydration."
- (already planned) auto-pace, weekly mileage, >15% jump flag, Fresno State countdown.

## 3. Sprint & Focus

- **"+5 min" flow extension** `[easy]` — a quiet button during an active sprint to
  add 5 minutes without breaking the timer, for when you're locked in past 25.
- **Sprint stacking** `[easy]` — chain 3 completed sprints into a visual "Block" /
  "Session" so a run of dots reads like a workout block.

## 4. Money

- **Run-rate / projection** `[easy]` — "at your current daily average you'll bank
  $X by month-end." Pairs with the required-pace number already specced.
- **Make "the pile" bigger** `[easy]` — lifetime banked total gets the boldest
  scoreboard typography in the app. Watching one number climb replaces the urge to
  waste time/money.

## 5. Weekly review → "Sunday Debrief"

- Auto-stats (clean days, sprints, $, miles) + the good/bad report (#2 above) +
  the three questions already specced. Last week's "one change" shown up top.
- 🔶 Optional rename: "Weekly Review" → **"Sunday Debrief"** (or "Post-Meet
  Analysis"). Same for "Task List" → **"The Slate."** Track-room language. Your call —
  pure copy, zero cost, easy to toggle.

## 6. Accountability wiring (Phase 3, the "unfakeable" layer)

- A **miss** on any tracked item → push notification to you → if still unresolved,
  auto-text a partner from your list (#4). This is where #1 ("failed option") and the
  multi-partner list pay off. See the architecture notes in memory / our chat:
  Apple Shortcuts → Supabase functions → web push + Twilio. `[backend]`

---

## 🔶 Open decision: accent color

The pasted research recommends **track-lane red-orange (#E14D2A)**. But you already
chose **deep gold (#F5A623)**, confirmed you like the app, and asked for a blacker
base — and the original spec said *pick one* of red-orange **or** gold. So this is a
real fork, not a to-do:

- **Gold (current):** "championship," warm, distinct from every red "warning" UI.
- **Red-orange:** literally a Mondo track surface — grittier, more "speed."

It's **one CSS variable** (`--accent` in `src/index.css`) — I can show you both side
by side in 2 minutes whenever you want. Until you say otherwise, we stay gold.

---

## Notes on the source

The bulk of this came from a research dump (clearly written by another AI). It's
genuinely good and well-aligned with how you operate — I've kept what's strong,
flagged what won't work on iPhone (haptics), and surfaced the one thing that
contradicts a choice you already made (the color). The 37 verses are already done
(World English Bible, public domain) and don't need refining unless you want
different passages. Schema changes (shoes, partners list, missed state, reading plan)
all land cleanly in Phase 2 — that's the right time to touch the data model.
