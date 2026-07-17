# 04 · DESIGN RUBRIC — the scorecard Claude Design self-grades against
### Telemetry design handoff kit v2 · 2026-07-14

*Turn "the best design" into checkable criteria. **Self-grade before you return work.**
Weighted to Ian's three priorities (native polish · retention feel · App Store conversion).
The psychology spine is a **GATE**, not a category — any violation is an auto-fail regardless
of how high everything else scores. Target for "perfect the champion": **≥ 92 / 100, zero
gate failures, zero auto-fails.***

---

## THE GATE — psychology & hard-rules (pass/fail, not scored)

If **any** of these is true anywhere in the deliverables, the work is **rejected outright** —
do not return it. This overrides all aesthetics (see 03 §2).

- [ ] A miss / reset / slip renders **red**, or as a stain, penalty, or verdict on the person.
- [ ] Lane-red (`--accent`) appears on **anything but commitment** (seal, Start, ◆) — e.g. as
      decoration, emphasis borders, or a miss marker.
- [ ] A stark **0 or a broken streak is the dominant number** on any screen (lifetime piles
      must dominate day-zero).
- [ ] Any **confetti, badge, points, leaderboard, variable-reward reveal, streak-loss
      interstitial, or same-day failure tally.**
- [ ] `--neg` (oxblood) used on the **person's own record** rather than external data only.
- [ ] A **haptic fires on a miss/reset/slip**, or faith content is scored, or HELP NOW / the
      988 line is missing from a crisis surface.

**Zero boxes checked = gate passed.** Any box checked = fix before scoring.

---

## SCORED CATEGORIES (100 points)

Each scored 1–5, ×weight. **5** = ships as-is, best-in-class; **3** = acceptable, minor gaps;
**1** = missing or wrong. Pass bar per category noted.

### 1 · Craft & the object — 22 pts (×4.4) · pass ≥ 3.5
The manila-and-carbon object is exceptional, not merely tasteful.
- **5:** Type trio sings (mono/serif/sans contrast carries hierarchy, no weight-shouting);
  de-boxing has real **rhythm** (03 §7) and **exactly one focal point per screen**; the seal
  ceremony is a genuinely covetable interaction; density (record) vs air (ceremony) is
  deliberate. You'd screenshot it unprompted.
- **3:** Looks clean but flattens into grey hairline rows in places; focal point ambiguous on
  ≥1 hero screen; seal ceremony is competent but not covetable.
- **1:** Reads as a generic minimal template; monotony; no focal discipline.

### 2 · iOS-26 native polish & the native boundary — 22 pts (×4.4) · pass ≥ 3.5 · *priority 1*
Feels unmistakably native in the Liquid Glass era; the paper↔glass seam is designed (03 §12).
- **5:** Status bar bound per skin; safe areas exact; native sheets (StoreKit/share/permission)
  tinted to the active skin; scroll has native momentum; the `UIDesignRequiresCompatibility`
  decision is designed-to; nothing reads as "web page in a shell."
- **3:** Safe areas handled but ≥1 native seam (paywall sheet, share, notification) left cold
  default-glass; boundary mostly ignored.
- **1:** No Liquid Glass awareness; cold system sheets over warm manila; obviously hybrid.
- **Auto-fail this category to ≤2** if there is **no reconciliation of the native surfaces at
  all** — this was the #1 red-team blocker.

### 3 · Daily-use retention feel — 18 pts (×3.6) · pass ≥ 3.5 · *priority 2*
Wins retention by **making accumulation beautiful**, never by loss-threat (03 §2; research C3).
- **5:** The lifetime piles, the ledger-that-only-accrues, and the WeekGrid of posted seals are
  the most beautiful, most-photographed things in the app; opening it at 6:45am/10:15pm feels
  like a calm ritual; the seal is something you *want* to do.
- **3:** Progress is visible but not gorgeous; the WeekGrid is functional, not a hero.
- **1:** Relies on any loss/pressure mechanic (→ also a GATE failure) or feels like a chore.

### 4 · App Store conversion assets — 18 pts (×3.6) · pass ≥ 3.5 · *priority 3*
Icon + shots 1–2 win the 7-second decision (03 §14; research B).
- **5:** Shot 1 carries the whole pitch top-left in one glance; consistent designed frame
  system; captions high-contrast + OCR-legible + keyword-woven; preview video storyboarded
  around the seal; icon designed as layered iOS-26 `.icon` with dark + monochrome variants.
- **3:** Shots designed but generic framing, or captions low-contrast, or icon still a flat PNG.
- **1:** Screenshots are raw screen grabs; no video; dated icon.

### 5 · Motion & haptics — 10 pts (×2) · pass ≥ 3
Four verbs only; the seal ceremony spent richly; haptic grammar mirrors the accent (03 §9–10).
- **5:** Motion is calm and confined to the four verbs; seal ceremony fully timed with a
  reduced-motion fallback; haptic grammar table honored (one earned tap on commit, **none** on
  miss); `.prepare()` noted.
- **3:** Motion fine but haptics vague or over-applied; reduced-motion fallback missing.
- **1:** Chases Liquid Glass fluid animation; buzzy haptics; celebration motion.

### 6 · Accessibility & Dynamic Type — 10 pts (×2) · pass ≥ 3.5 · *rejection risk*
Text scales, layouts reflow, contrast holds (03 §13; research E3).
- **5:** Every hero screen shows its **AX3 reflow**; body/labels honor text size (floor 11px);
  hero mono scales; heat-sheet/trial-balance **column-stack** at AX sizes; 44×44 targets;
  accent guard enforced; `--faint` ≥4.5:1.
- **3:** Contrast + targets fine but no Dynamic Type reflow shown.
- **1:** Fixed type everywhere, no reflow — **App Review rejection risk.**
- **Auto-fail this category to ≤2** if there is **no Dynamic Type story at all.**

---

## SCORING

```
Gate:            PASS / FAIL   (any check = FAIL → do not return)
1 Craft          __/5 ×4.4 = __
2 Native polish  __/5 ×4.4 = __
3 Retention      __/5 ×3.6 = __
4 Store assets   __/5 ×3.6 = __
5 Motion+haptics __/5 ×2.0 = __
6 A11y / Type    __/5 ×2.0 = __
                 TOTAL   = __ / 100
```

**Return only if:** Gate = PASS · Total ≥ 92 · no category below its pass bar · no
category auto-failed. Below 92, or any category under bar, revise that category and re-grade.
Include your filled scorecard + a one-line justification per category in the handoff back — it
tells Ian and the eng team exactly where the confidence is.

---

## The five questions to ask yourself before you return (the fast version)

1. **Could any pixel make a 19-year-old in a shame cycle feel like a failure?** (Gate.)
2. **If I put this next to a Liquid Glass OS, does the paper look intentional or broken?** (Native.)
3. **Is the thing I'd screenshot the *accumulation* — the piles, the sealed week?** (Retention.)
4. **Does shot 1 sell the whole app in the two seconds half of buyers give it?** (Conversion.)
5. **Does the seal feel like something I *want* to do with my thumb?** (Craft + haptics.)

If all five are yes and the gate is clean, you've perfected the champion.
