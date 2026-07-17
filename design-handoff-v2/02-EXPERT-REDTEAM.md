# 02 · EXPERT RED-TEAM — three harsh critics attack the champion
### Telemetry design handoff kit v2 · 2026-07-14

*Mandate: **perfect the champion.** Split Ledger is ratified; nobody here is trying to
replace it. Their job is to find every reason it is still an 88 and not a 95, grounded in
the actual code (`src/index.css`), the current handoff
(`design-prompts/HANDOFF-claude-design-split-ledger.md`), the constitution's own
carried-forward list (`CONSTITUTION.md` §A2), and the 2026 research (01). Findings are
tagged **[BLOCKER] / [MAJOR] / [MINOR]** and each carries a fix. Every critic was told the
psychology hard-rules are off the table — no fix may reintroduce shame, red-on-miss,
loss-framing, or gamification.*

The three lenses match Ian's brief exactly: **app design · marketing/growth · iOS vision.**

---

## CRITIC 1 — The App-Design Director
### *lens: craft, interaction, information hierarchy, the feel of the object*
**Verdict: 86 / 100.** "The metaphor is a genuine 92 — best I've reviewed in the category.
The *execution spec* is an 86 because the two moments that carry the whole app (the seal
ceremony and the empty book) are under-specified, and the de-boxing is one rhythm mistake
away from monotony. Fix those three and this is a 95."

**C1-1 · The seal ceremony is the hero and it's spec'd as a footnote. [BLOCKER]**
The handoff asks for the seal as a "4-frame interaction spec (rest → press-sweep → stamp →
posted)." That is the single most important interaction in the product — it's the retention
driver (01 §C3), the App Store video (01 §B2), the TikTok hook, and the one bodily moment
(01 §E1) *all at once.* Four static frames won't cut it.
→ **Fix:** promote the seal to a **full interaction deliverable** — timing curve of the
press-sweep (the 1200ms `rule-draw`), what happens on early release (cancel at zero cost,
no penalty visual), the stamp settle (`seal-press` 0.98→1), the haptic beat aligned to the
stamp frame (01 §E1), the `prefers-reduced-motion` fallback (cross-fade, no sweep), and the
"posted" resting state. Design it once; it's reused on every commit surface (Start, INITIALIZE,
"I stayed", post-a-block). 03 §The Seal Ceremony makes this a named screen.

**C1-2 · "An empty book on day one" is the first impression and isn't a designed screen. [BLOCKER]**
The logic handles day-0 (constitution M1: "Nothing on the book yet," no red dots on fresh
install). But **visually**, a radius-0, surface≈bg, hairline-ruled manila page **with almost
nothing on it** is a coin-flip: it either reads as *"a fresh page waiting for you"* (magic)
or *"is this broken / did it not load?"* (churn). This is the very first thing a new
subscriber sees after onboarding, and it is not on the deliverables list.
→ **Fix:** make **Day-0 / empty states a first-class deliverable** for the three surfaces a
new user hits first — the empty deck, the empty WeekGrid, the never-run timer. Design the
*invitation*: a ruled-but-waiting page, a single quiet prompt in the intercom voice ("First
entry goes here."), the seal ring faint and un-stamped. Silence is content — but *designed*
silence, not absence. (03 §Empty & First-Run States.)

**C1-3 · De-boxing can collapse into a wall of grey text. [MAJOR]**
Radius 0 + surface≈bg (one paper step) + a single bottom hairline is the champion's nerve
and it's right — but without an explicit **vertical rhythm and focal discipline**, a screen
of hairline rows reads as undifferentiated. The tournament's holdout (Developer, 78) was
really worried about this. Every screen needs **exactly one focal point.**
→ **Fix:** 03 adds a **rhythm + focal spec**: a defined spacing scale, a rule about *one*
lane-red mark per page maximum, and a "where does the eye land first at 6:45am?" answer for
each hero screen (the DeepWork Start, the ◆ high-impact row, the streak total). Calm is the
flex; monotony is the failure mode. They are 4px apart.

**C1-4 · The three skins may be one screen recolored three times. [MAJOR]**
Split Book / Lamplight / Carbon are palettes. But the champion also says each has a *register*
(Lamplight = the vulnerable evening; Carbon = all-day, co-equal). Recolor alone won't earn a
theme switch or justify Carbon being "co-equal, not an afterthought."
→ **Fix:** give each skin **a reason to exist beyond hue** — Lamplight slightly larger line
spacing and dimmer rules (a quieter, later-at-night register); Carbon a hair more contrast
and tighter rules (all-day, sharper). Same components, different *breath*. Design **Carbon
first among the darks**, as the champion demanded, so it can't become an afterthought.

**C1-5 · The intercom voice is required but has no visual container. [MINOR]**
The one warm human line (reset, second miss, morning-after) is spec'd as "full-strength ink,
body face, sentence case, no semantic color" — but it has **no layout home.** On a page of
mono ledger rows, a lone sans sentence can look like a mistake unless it's given a deliberate
place.
→ **Fix:** design the **intercom block** as a named pattern (03 §The Intercom) — e.g. an
un-ruled inset with generous air, the one place on any screen with no hairline, so its warmth
reads as intentional. It's the human voice; give it room to breathe.

---

## CRITIC 2 — The Growth / ASO Lead
### *lens: the funnel — icon, first screenshots, paywall, trial, virality*
**Verdict: 82 / 100.** "The product design is ahead of the *go-to-market* design. You've
built a beautiful object and you're planning to photograph it with your phone in bad light.
~50% of your conversion is decided by two screenshots and an icon you haven't designed to
2026 spec. This is the cheapest 10 points in the whole kit."

**C2-1 · Screenshots are a shot-list, not a designed system. [BLOCKER]**
`marketing/ASO.md` has a solid 6-shot *list* with captions — but there is **no screenshot
design spec**: no frame system, no caption type treatment, no value-prop-top-left rule, no
social-proof band. Research (01 §B) is blunt: **~7 seconds, half the users see only shots
1–2, a strong set is +20–35% install, social proof on shot 1 up to +90%.** Screenshots are
being treated as an export step; they're half the funnel.
→ **Fix:** 03 §App Store Asset Design specifies the shot system — a consistent manila frame,
**carbon caption type top-aligned and OCR-legible** (captions are now keyword-ranked, 01 §B3),
shot 1 = the pure pitch (manila + carbon numerals + one seal + "Every pro keeps a book"),
one honest social-proof band added the moment a real number exists. These are **design
deliverables**, not screen grabs.

**C2-2 · No app-preview video, and the obvious hero isn't storyboarded. [MAJOR]**
A video preview is worth **+16–35%** and Telemetry has the best hero moment in the category
sitting unused: **the seal ceremony and the stopwatch-cut-to-manila.**
→ **Fix:** storyboard a **15–20s app-preview loop** (03 §App Store Asset Design): black →
carbon stopwatch counting → thumb press → seal sweeps closed → cut to manila page, entry
posted → "Every pro keeps a book." It doubles as the primary TikTok asset (lower priority
this pass, but free once the video exists).

**C2-3 · The icon isn't designed for iOS 26. [MAJOR]**
"Lane-red seal ring on manila, legible at 60px" is a great *concept* but the current spec
predates Icon Composer. In 2026, icons are **layered `.icon` files with dark + tinted
(monochrome) variants** (01 §A4). A flat PNG will look dated beside layered glass icons on
the shelf.
→ **Fix:** design the icon as **3 Icon Composer layers** (manila ground · carbon hairline
ring · lane-red seal) with **explicit dark and monochrome/tinted variants.** The seal ring
holds up in monochrome where neon gradients die — another shelf win. 05 lists the export
contract.

**C2-4 · The paywall doesn't reflect the user back to himself. [MAJOR]**
`Paywall.jsx` is in-voice ("Your book is yours. The coach is hired.") and the constitution
(§A2) already fixed the copy that was selling free features. But structurally it's still a
**generic value grid.** Research (01 §C1) is unambiguous: **surfacing the user's captured
onboarding goals on the paywall beats almost any layout change**, and 82% of trials start
Day 0 right after onboarding.
→ **Fix:** design a **"your book, personalized" paywall** (03 §Paywall): a header that names
what he just told the book (his focus goal, his danger window, his witness), then a clean
**two-column ledger split — "In your free book" vs "With the coach"** so it is structurally
impossible to sell a free feature as paid. Annual pushed as ratified. Make the **trial-length
number a single string/token** so 7-day vs 14-day can be A/B tested without a redraw (01 §C2).

**C2-5 · Captions set for taste will cost ranking. [MINOR]**
Any instinct to set screenshot captions in faint/low-contrast ink for elegance now costs
**search ranking**, because Apple OCRs and indexes caption text (01 §B3).
→ **Fix:** captions in **high-contrast carbon on manila at a legible size**, keyword set from
`ASO.md` woven in naturally. The palette already makes this easy; just don't get precious.

---

## CRITIC 3 — The iOS Platform Purist
### *lens: does this feel like a 2026 native iOS app, or a web page in a shell?*
**Verdict: 79 / 100.** "The taste is impeccable and the platform awareness is a year out of
date — which is not the designer's fault, it's the calendar's. The handoff was written before
Liquid Glass shipped and before the SDK deadline passed. Right now this app has no answer for
the single biggest thing that happened to iOS since 2013, no haptics, and a Dynamic Type
story that could get it rejected. Every one of these is fixable and none touches the paper."

**C3-1 · Zero Liquid Glass reconciliation. The paper↔glass boundary is undesigned. [BLOCKER]**
The current handoff never mentions Liquid Glass or the **April 28 2026 SDK-26 mandate** (01
§A2) — which has already passed, so Telemetry **cannot submit without building against the
iOS 26 SDK.** The web content (manila) is safe (content layers were never glass), but the
surfaces the app doesn't draw — **StoreKit paywall sheet, iOS share sheet, permission dialogs,
the local notification, the Home-Screen widget, the status bar, the app icon** — now live in
the glass world and will look foreign against warm manila.
→ **Fix:** 03 §The Native Boundary designs the seam: status-bar content style bound per skin
(dark content on manila, light on Carbon/Lamplight), native sheets **tinted to the active
skin's ink/accent** where the API allows, the widget and icon given first-class paper-and-seal
treatments. This is the highest-leverage single addition in the entire kit.

**C3-2 · Make a *decision* on `UIDesignRequiresCompatibility`, don't drift into one. [MAJOR]**
Building with Xcode 26 auto-applies Liquid Glass to any native controls (01 §A2). Telemetry
draws its own UI in a webview and wants a specific non-glass look.
→ **Recommendation (engineering + design agree):** for **v1, set
`UIDesignRequiresCompatibility = YES`** to prevent unexpected restyling of the few native
controls in play, ship the deliberate paper look, **and treat it as explicitly temporary** —
the flag is removed in Xcode 27 and Liquid Glass is mandatory in iOS 27. In parallel, design
the native surfaces (C3-1) to **harmonize with glass** so that when the opt-out disappears,
Telemetry meets it gracefully rather than breaking. Document the decision in `SHIPPING.md`.
*(This is the Co-CEO/eng call, recorded here so Claude Design designs to it.)*

**C3-3 · No haptics anywhere. The paper has no physical feel. [MAJOR]**
A paper app's biggest sensory liability is that glass is cold and so is a screenshot — the one
thing that can make manila feel *physical* is touch, and there's no haptic spec (01 §E1).
→ **Fix:** adopt the **haptic grammar that mirrors the accent grammar** (03 §Haptics): one
deliberate success-tap on the seal/commit, the lightest selection tick on detents/tabs, and
**nothing on a miss/reset/slip** (a buzz on a slip is a bodily verdict — same reason it's
never red). Cheap in Capacitor, enormous for perceived nativeness.

**C3-4 · Dynamic Type is unsolved and is a rejection risk. [MAJOR]**
The champion uses **fixed 11px caps and large fixed mono numerals.** Apple expects text to
honor the user's size (12 steps incl. AX1–AX5); **custom fonts that don't scale can be
grounds for rejection** and exclude low-vision users (01 §E3).
→ **Fix:** 03 §Accessibility specifies a scaling + reflow story — relative units that honor
text size, hero mono that scales (a bigger clock is still the hero), **column-stacking reflow**
for the heat sheet and trial-balance strips at AX sizes, floor at 11px. 04 scores it; it's a
hard gate.

**C3-5 · The Home-Screen widget has native files but no paper design. [MAJOR]**
`ios/App/TelemetryWidget/` exists but there's **no visual spec** — so it will default to
system SwiftUI styling and look nothing like the app. A widget is a retention + acquisition
surface (it's on the home screen next to the glass icons).
→ **Fix:** design the widget as **the book's spine on the home screen** — manila ground,
carbon "DAYS ON THE BOOK n," one seal, small/medium sizes. It's the paper object living in
the glass OS, every time he looks at his phone. (03 §Widget, 05 export.)

**C3-6 · Carried-forward AA-contrast on lane-red is still open. [MINOR]**
`CONSTITUTION.md` §A2 logs "AA-contrast on lane-red needs a token-level pass" as *carried,
not fixed.* Lane-red `#C93F22` is **4.3:1 on manila** — a *large-text* pass (≥13px/500) but a
**fail for any smaller lane-red text.**
→ **Fix:** enforce the existing accent guard in the design (lane-red only on fills, seals,
rules, ◆, and text ≥13px/500 — never small body), and where a small red label is unavoidable,
use ink weight instead of hue. 04 makes contrast a scored line with the exact ratios.

---

## SYNTHESIS — what changes, ranked, and where it's fixed

| # | Finding | Severity | Fixed in |
|---|---|---|---|
| 1 | No Liquid Glass reconciliation / SDK-26 boundary (C3-1) | BLOCKER | 03 §Native Boundary · 05 |
| 2 | Seal ceremony under-specified for its importance (C1-1) | BLOCKER | 03 §The Seal Ceremony |
| 3 | Day-0 / empty "first impression" not designed (C1-2) | BLOCKER | 03 §Empty & First-Run States |
| 4 | Screenshots + icon + video not designed to 2026 spec (C2-1/2/3) | MAJOR×3 | 03 §App Store Asset Design · 05 |
| 5 | No haptics; paper has no physical feel (C3-3) | MAJOR | 03 §Haptics |
| 6 | Dynamic Type gap = rejection risk (C3-4) | MAJOR | 03 §Accessibility · 04 |
| 7 | Paywall doesn't personalize from onboarding (C2-4) | MAJOR | 03 §Paywall |
| 8 | Widget has no paper design (C3-5) | MAJOR | 03 §Widget · 05 |
| 9 | `UIDesignRequiresCompatibility` needs a documented decision (C3-2) | MAJOR | 03 §Native Boundary (decided) · 05 |
| 10 | De-boxing → monotony without a rhythm/focal spec (C1-3) | MAJOR | 03 §Rhythm & Focal Discipline |
| 11 | Skins recolored, not re-registered (C1-4) | MAJOR | 03 §The Three Skins |
| 12 | "Refactor/Sync" jargon in the ledger voice (carried, CONSTITUTION §A2) | MINOR | 03 §Copy in the Ledger Voice |
| 13 | Intercom voice has no visual container (C1-5) | MINOR | 03 §The Intercom |
| 14 | Lane-red AA-contrast still open (C3-6) | MINOR | 03 §Accessibility · 04 |
| 15 | Captions must stay high-contrast for OCR/ASO (C2-5) | MINOR | 03 §App Store Asset Design |

**Consensus scores → target:** App Design 86, Growth 82, Platform 79 (mean **82.3**). Every
finding above is additive to the champion, not a redirection. Ship all fixes and the panel's
projected re-score is **94–96** — the "perfect the champion" goal. **None of the 15 fixes
touches the psychology spine; four of them (haptics-silence-on-slip, no-loss-streak retention,
personalized-but-honest paywall, red-only-on-commit) actively reinforce it.**

Proceed to **03-HANDOFF-v2.md** — the brief that folds all fifteen in.
