# CLAUDE DESIGN BRIEF — "ZEN LEDGER"

## Product
Telemetry — a paid iOS discipline/accountability app for young men (18–25, "lock in" niche, TikTok funnel → App Store subscription). React + Capacitor. The AI builds the user's daily schedule from an onboarding diagnostic; a "Guardian" engine watches drift and sends one push per day. Design must be expressible as CSS custom-property tokens (a reskin = one token file), and must look exceptional in a 30-second vertical screen recording.

## Design thesis
Discipline is bookkeeping, not combat. Every block, sprint, and urge outlasted is an entry posted in ink on warm paper — permanent, additive, unglamorous. The interface is a beautiful daily ledger: ruled hairlines instead of boxes, carbon ink instead of glow, and ONE vermilion seal reserved for the moment you commit. Calm is the flex.

## Color template (default skin — "Daybook")
- bg `#F2ECDF` (cream) · surface `#FBF7EE` · surface2 `#EBE4D3` · line `#D8CFBB`
- ink `#26231C` (carbon) · muted `#877E6B`
- accent (vermilion seal) `#C8452C` · accentInk `#FBF7EE`
- pos (moss) `#40714F` · neg (oxblood) `#8F3B45` · warn (ochre) `#A97B1F`

Alternate skins: **Lamplight** — dim amber-washed ink-dark paper, desaturated seal (the late-night vulnerable window); **Carbon Copy** — cool graphite dark, ink reversed to bone-white, seal muted brick (all-day dark users).

## Typography
- Display: **New York** (ui-serif, free on iOS; fallback Source Serif 4 OFL) — headings, ceremony copy, Guardian marginalia in italic
- Body: **SF Pro Text** (system) — labels, settings, prose; 15px/1.5
- Data: **IBM Plex Mono** (OFL, 400/500), tabular-nums — every numeral, time, and total; medium for hero readouts
- Column heads/widget titles: SF Pro 11px uppercase +0.08em muted. Numerals never bold-black — hierarchy from size and the serif/mono contrast, not weight shouting

## Shape & motion
Flat paper, zero drop shadows. Cards are regions between 1px ruled hairlines, not floating boxes; 6px radius only on tappable controls; full-width rules divide sections like ledger pages. The seal is the SOLE circle in the system — everything else rectilinear. Motion: ink-settle (160ms fade + 2px rise), breath (1800ms pulse on running clocks only), rule-draw (line-sweep progress), seal-press (0.98→1 settle on commit). Reduced-motion collapses all; no color flashes.

## Screens to design (deliverables)
1. **Deck "Today" tab** — ledger lines: mono time column, body label, hairline rule under each row; ◆ high-impact = small filled vermilion diamond in the margin; done = carbon ink check; missed = open graphite circle ("not posted") — NEVER red
2. **DeepWorkTimer** — idle: one blank ruled line labeled "Next entry" + a quiet vermilion Start; running: full-bleed paper, giant Plex Mono carbon numerals, single breathing vermilion underline; finished: "Posted." + seal-press, no fanfare
3. **Urge protocol full-screen** — paper inverts to lamplit ink-dark regardless of skin (a private night page); lifetime total dominant in mono, current run secondary; hold-to-seal = thumb press sweeps a circular vermilion seal outline, release stamps it: "Entry posted. Urge outlasted — 38 total."
4. **Guardian drift card** — marginalia, not an alert: indented block, 2px ochre left rule, New York italic observation, plain-ink suggested action; a bookkeeper's pencil note in the margin
5. **Onboarding node** — "opening a new ledger": serif question as the heading line; focus-goal radios = circles that fill with ink on tap; health-link checkboxes = ruled rows with square ink-tick boxes; progress = rule-draw across the top
6. **WeekGrid** — seven ruled calendar cells: completed day earns a small round vermilion seal-mark (hanko); incomplete stays blank paper (absence, never a stain); two consecutive blanks surface a quiet "Reset tomorrow" line
7. **KpiGrid/StatRow** — trial-balance strip: hairline column rules, small-caps muted labels, Plex Mono carbon figures; external-data deltas use moss/oxblood ▲▼ glyphs on the numeral only — no tinted pills
8. **App icon** — cream field, one vermilion seal circle, carbon hairline ring

## Binding psychology guardrails (non-negotiable)
- Entries only ACCRUE; blanks are unposted lines — not debts, not stains; red can never mark a person's miss
- Vermilion is STRUCTURALLY reserved for the seal of commitment — enforce this in every screen
- Lifetime totals hold the dominant mono position; day-zero is one small line
- No confetti, badges, points, leaderboards, or variable-reward reveals — a posted entry is its own quiet proof

## Judge notes to solve (from the design tournament)
- Podcaster (56/100) + CEO (66) — the existential critique: "a Hobonichi for a 34-year-old meditator sold to a 19-year-old sprinter." The design MUST find masculine gravity without losing the calm: heavier carbon numerals in hero positions, a starker Carbon Copy dark skin treated as co-equal (not an afterthought), and the seal ceremony shot as the TikTok hook — the thumb-press stamp is the ten seconds that sells it. Design the Carbon Copy skin FIRST among the alternates
- Psychologist (77): give the 19-year-old an identity to step into — the ledger of a man who keeps his word, not a diary; copy and iconography should carry "record-keeper," never "journaler"
- Therapist (90 — the highest safety score in the tournament): the lamplit night page and unposted-line grammar are the strengths; do not trade them away while solving the above
- Developer (78): the de-boxing (cards → ruled regions) is the main component cost — provide the rule/region spec precisely

## Output wanted
High-fidelity screens for all 8 deliverables (390×844), the token sheet as CSS custom properties for all 3 skins (Carbon Copy fully realized), and the seal ceremony as a 4-frame interaction spec (rest → press-sweep → stamp → posted).
