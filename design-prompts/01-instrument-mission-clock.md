# CLAUDE DESIGN BRIEF — "INSTRUMENT · Mission Clock"
*(Tournament result: runner-up, 84.3 — the developer's top pick: "the one I could hand to this codebase Monday morning." The Fable 5 judge's caveat: "a tasteful evolution of the very dark-green-on-black species the owner ordered scrapped." Its intercom voice, Arc primitive, and count-UP urge bezel were grafted into the champion.)*

## Product
Telemetry — a paid iOS discipline/accountability app for young men (18–25, "lock in" niche, TikTok funnel → App Store subscription). React + Capacitor. The AI builds the user's daily schedule from an onboarding diagnostic; a "Guardian" engine watches drift and sends one push per day. Design must be expressible as CSS custom-property tokens (a reskin = one token file), and must look exceptional in a 30-second vertical screen recording.

## Design thesis
Instruments you trust with your life never cheer and never scold — they read conditions and hold steady. Telemetry becomes a flight/dive instrument cluster: matte dial, chalk ink, charged lume, hairline bezels. Every number is a gauge reading about the mission, never a verdict on the pilot — and one warm human voice ("the intercom") rides beside the instruments.

## Color template (default skin — "flieger")
- bg `#060807` · surface `#0C100D` · surface2 `#121712` · line `#232B24`
- ink `#EDEFE4` (chalk) · muted `#7A857A`
- accent (lume) `#9FE6AE` · accentInk `#0A1A10`
- pos `#6FCB8F` · neg `#E0604F` · warn `#F0A44A`

Alternate skins: **sector** — silvered sector-dial paper, blued-steel accent `#2E5FA3`, glow off; **deep_dive** — aged-tritium lume `#7FBF95`, amber suppressed, lowest luminance (for the late-night vulnerable window).

## Typography
- Display: **B612 Bold** (Airbus cockpit typeface, OFL) — dial labels, 11px uppercase, +0.12em tracking
- Body: **SF Pro Text** (system) — sentence case; this is also the "intercom" voice: never caps, never mono
- Data: **B612 Mono** (OFL), tabular-nums — every numeral and clock; the lume readout face
- Hierarchy from size/case/letterspacing, never weight above 700

## Shape & motion
Circles and hairlines. Cards = watch cases: 16px radius, 1px line border, 1px inset "rehaut" ring (inset shadow), flat matte, faint radial dial vignette; zero drop shadows. Progress arcs come from ONE shared conic-gradient arc primitive; ticks are 1–2px marks. Motion: sweep (arc/width transitions), lume-settle (1800ms opacity pulse on running clocks only), index-tick (60ms staggered row entry). No overshoot, no color flashes, reduced-motion collapses all.

## Screens to design (deliverables)
1. **Deck "Today" tab** — flight-plan strip schedule (hairline tick column, B612 Mono times, ◆ high-impact marker as an amber flieger 12-o'clock triangle; done = lume-filled tick; missed = hollow line-colored ring, NEVER red)
2. **DeepWorkTimer running cockpit** — full-screen giant B612 Mono readout breathing, ticked arc ring progress; finished state closes the arc and dims to rest, no celebration
3. **Urge protocol ("Outlast") full-screen** — a dive bezel counting elapsed time UP (dive bezels measure survival, not deadline), copy "RIDE IT OUT — URGES CREST AND PASS", hold-to-seal = screwing down the crown (width-sweep fill); lifetime total dominant, current run secondary
4. **Guardian drift card** — a ticked horizontal drift bar: hairline scale, center lume index, amber marker 3° off; caption "DRIFT — 3° OFF PLAN", one lume RECENTER action. Amber = condition, never verdict
5. **Onboarding node** — "calibration sequence": CAL 04/15 ticked progress ring; focus-goal radios as a detent list (tick fills lume on select); health-link checkboxes as guarded lever rows, lume when armed
6. **WeekGrid** — seven circular apertures: done = solid lume disc, today = ticking outline, not-yet = hollow ring, missed = matte surface2 disc, identical weight (a miss is machined absence, not a wound)
7. **App icon** — matte `#060807` dial, one hairline outer ring, single lume triangle index at 12, nothing else; reads as a tool-watch macro at 60px

## The intercom voice (required surface)
At every slip moment (reset, second consecutive miss, the morning after) the cockpit yields one warm human register: full-strength ink, body face, sentence case, zero semantic color. "Everyone resets. Next rep: leave the room." A crew-mate, not a gauge.

## Binding psychology guardrails (non-negotiable)
- A user's missed block / broken streak may NEVER render red or punitive — misses are hollow rings or matte grey discs, identical size to their neighbors
- neg/red exists only for EXTERNAL conditions (markets, biometrics) — the person's own record never wears it
- No confetti, badges, points, leaderboards, or variable-reward reveals; completion settles, never celebrates
- Lifetime totals always hold visual dominance over the day-0 clock

## Judge notes to solve (from the design tournament)
- Developer (56/100): keep every gauge buildable as ONE shared conic-gradient arc primitive + CSS ticks — no bespoke SVG instrument cluster, no rotary interactions
- Podcaster (79): frame one of the TikTok hook must be the giant climbing readout ("OUTLAST IN PROGRESS · 00:07:42"), not a slow arc
- Therapist/Psychologist (78/84): the intercom voice is the answer to "instruments never comfort" — give it real visual presence, not a footnote

## Output wanted
High-fidelity screens for all 7 deliverables (390×844), the token sheet as CSS custom properties for all 3 skins, and the arc-primitive spec (states: progress, bezel-up, drift bar, calibration ring).
