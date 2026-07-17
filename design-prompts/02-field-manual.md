# CLAUDE DESIGN BRIEF — "FIELD MANUAL"
*(Tournament result: 3rd, 77.0. Its refinement de-militarized the register — cut DD-01/SORTIE/stencil, display face became IBM Plex Mono SemiBold — which raised the therapist from 67→87 but the CEO called it "correct and fatal": stripped of fieldcraft it lost its identity engine. If you run this brief, keep the therapist fixes below but hold the print-authority nerve. Its six-utility print-chrome kit and quiet FaithCard were grafted into the champion.)*

## Product
Telemetry — a paid iOS discipline/accountability app for young men (18–25, "lock in" niche, TikTok funnel → App Store subscription). React + Capacitor. The AI builds the user's daily schedule from an onboarding diagnostic; a "Guardian" engine watches drift and sends one push per day. Design must be expressible as CSS custom-property tokens (a reskin = one token file), and must look exceptional in a 30-second vertical screen recording.

## Design thesis
Discipline as fieldcraft, not finance. The app is a printed technical document — duty roster, intake form, quartermaster ledger — that the operator fills in himself. Paper tones, ink rules, stamps, and checkbox culture replace glow and candlesticks. Nothing gambles, nothing shouts; the record simply accrues, page after page. The calm authority of print carries the tone.

## Color template (default skin — "field_desk")
- bg `#EAE4D3` (manila) · surface `#F4EFE0` · surface2 `#E1DAC5` · line `#B9B098`
- ink `#26291F` · muted `#6F6B58`
- accent (signal orange) `#C8501B` · accentInk `#FBF6E9`
- pos (olive) `#4C6B37` · neg `#9E3B2B` · warn (ochre) `#8F6B1E`

Alternate skins: **night_march** — blackout olive-black, dim sage accent, ochre warn, zero glow (the late-night vulnerable window); **winter_line** — cold whiteout grey-white paper, slate ink, orange intact.

## Typography
- Display: **Allerta Stencil** (OFL) — uppercase only, +8% tracking; RATIONED to one element per screen (section header, stamp, or tab label) so it reads as stamped authority, not costume. Never body copy, never numerals
- Body: **SF Pro Text** (system) — all prose and form labels, 15px/1.5
- Data: **IBM Plex Mono** (OFL), tabular-nums — every numeral, timestamp, countdown, ledger column, form-field ID ("01/15")

## Shape & motion
Near-square 2px radii. Depth via paper-tone steps and rule weight — never drop shadows, never glow. 1px hairline rules; double rules under section headers; corner registration ticks on cards. Buttons = stamped rectangles with 1.5px ink borders; checkboxes square, radios round. Motion: stamp-settle (scale 1.02→1 + fade), pulse-live beacon dot, sweep-fill width transitions. One ease; reduced-motion collapses all; zero color flashes.

## Screens to design (deliverables)
1. **Deck "Today" tab** — printed duty roster: Plex Mono time column, ruled form lines with square checkboxes; done = olive ink-fill; missed = empty box with a graphite pencil dash, NEVER red; the ◆ high-impact marker prints in signal orange — the page's ONLY orange
2. **DeepWorkTimer** — idle = a "SORTIE" form block (stencil header, mono duration field); running = full-bleed olive-black watch sheet, giant Plex Mono countdown, corner registration ticks, breath-pulse on the colon; finished = an olive oval COMPLETE stamp settling once
3. **Urge protocol ("HOLD POSITION") full-screen** — blackout olive sheet in every skin; StreakClock as calm mono readout; hold-to-seal = an ink-stamp press (stroke ring sweep-fills under the thumb) ending in an embossed "OUTLASTED — LOGGED · 38 TOTAL" stamp; tactical copy, zero moral language
4. **Guardian drift card** — "OBSERVER'S NOTE" marginalia: coyote-tinted inset, double left rule, mono body; drift stated as bearing correction ("Wake drifting +40min. Adjust tomorrow: 06:45"); ochre at most, never red, never an indictment
5. **Onboarding node** — "INTAKE FORM DD-01": numbered field (01/15) with stencil section header; focus-goal radios = pencil-fill bubbles; health-link checkboxes = equipment-manifest rows; footer "PAGE n OF 15"
6. **WeekGrid** — logbook calendar: completed day = solid olive stamp square; missed = empty printed box with paper showing through (absence, not alarm); today = signal-orange corner tick
7. **FaithCard** — the chaplain's page: lightest paper inset framed by a thin double rule, scripture in italic body face, mono reference line (PSALM 119:9); the quietest card in the deck — no accent, no stencil
8. **App icon** — manila field, single signal-orange ◆, stamped ink border

## Binding psychology guardrails (non-negotiable)
- A miss = ink WITHHELD (empty checkbox, pencil dash, blank paper), never red APPLIED — this is the structural no-shame grammar
- pos/neg ink only for external field conditions; personal totals always print in neutral ink and only grow
- No failure stamp exists in the vocabulary; stamps mark completion only
- No confetti, badges, points, leaderboards, or variable-reward reveals
- Reset copy: "Logged. March continues." — ledger entry, not verdict

## Judge notes to solve (from the design tournament)
- Therapist (67/100, the low score — this is the one to beat): a stenciled military intake form the morning after a slip risks reading as "reporting to a commanding officer." Soften the morning-after and post-slip surfaces specifically — more quartermaster's ledger, less drill sergeant; the chaplain's-page warmth should extend to every recovery-adjacent surface
- Psychologist (82): watch that operator-fieldcraft framing doesn't militarize the self-relationship — the operator fills in his OWN form; the app is the paper, never the officer
- Developer (72): stamps, registration ticks, and double rules must be a small set of reusable CSS utilities (borders/pseudo-elements), not bespoke per-widget artwork
- CEO (77): Allerta Stencil reads as costume rental — consider a more ownable stencil treatment (custom-spaced, partial masking) or an alternate authority face

## Output wanted
High-fidelity screens for all 8 deliverables (390×844), the token sheet as CSS custom properties for all 3 skins, and the print-utility spec (rules, stamps, registration ticks as reusable CSS patterns).
