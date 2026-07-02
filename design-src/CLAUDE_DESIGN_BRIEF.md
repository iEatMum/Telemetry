# Telemetry — Design-System Brief (for Claude Design)

Build me a **design system** for **Telemetry**, an iOS-first daily-discipline app with a
"perps trading terminal" aesthetic. This is NOT a set of bespoke screens — the app is a
**generative / server-driven UI**: it renders a JSON tree of allow-listed widgets into tabs.
So design a **reusable widget kit** plus a few tab compositions that assemble those widgets.
`TODAY / TRENDS / MIND` are tab *compositions*, not a fixed navigation bar.

## Platform & feel
- Mobile-first, iPhone. Design at **390×844**; content canvas **max-width 520px**, centered.
- **Dark by default.** Respect iOS safe areas (notch + home indicator).
- Terminal/perps look: near-black surfaces, hairline borders, **sharp corners** (radii 3–10px),
  monospace numerals with a subtle glow, strict **green-up / red-down** semantics.
- Voice: *data, not verdict.* Never shame the user. Recovery + faith content is opt-in and
  non-clinical.

## Themes (3) — build `terminal` fully, give the others as token overrides
- **terminal** (default): electric green `#16f08b` on near-black; numerals glow.
- **zen**: calm, lighter, glow OFF, more breathing room.
- **night_ops**: muted, after-hours, low-key.

## Design tokens — use these EXACT CSS variable names
Colors: `--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`,
`--accent` (#16f08b), `--accent-deep`, `--accent-ink` (text ON accent), `--accent-glow`,
`--pos`, `--neg`, `--warn`, `--pos-soft`, `--neg-soft`, `--warn-soft`.
Type: **`font-clock`** = monospace (ALL numerals, times, labels, "machine truth"), tabular figures;
**`font-sans`** = system sans (prose, supportive copy). Radii 3/4/5/6/8/10px. Border = `--line` hairline.

## FOUNDATIONS (one card each)
Color swatches for all 3 themes · type scale · **Card** (bordered surface) · **SectionLabel**
(xs, uppercase, wide tracking, muted) · **DeltaTag** (▲ green `--pos` / ▼ red `--neg` / ▬ muted) ·
**Sparkline** · **BarMeter** (thin progress track) · **TriStateBox** (done = accent fill+check /
missed = dashed × / open) · **Chip / pill toggle** · status **LED dot** (pulse).

## WIDGETS — one card per type; KEEP the prop contract (these map 1:1 to the render registry)
1. **DailyBriefing** — `{ date?, stats:[{label,value,tone:"pos"|"neg"|"warn"|"muted"}], drivers:[{tone,text}] }` (each driver renders as an "AI:" line)
2. **ScheduleMatrix** — `{ title?, rows:[{ time:"HH:MM", block, status:"hit"|"done"|"late"|"missed"|"open"|"skip", impact?:"high" (◆ marker), delta?:{value,dir} }] }`
3. **DeepWorkTimer** — `{ label, minutes, at?:"HH:MM", highImpact?, note? }` (the day's anchor focus block)
4. **GoalProgress** — `{ title?, items:[{label, value, max, right?, tone?:"accent"|"pos"|"warn"|"neg"}] }`
5. **KpiGrid** — `{ title?, cols?, items:[{label, value, unit?, delta?, deltaSuffix?, spark?:number[], sparkTone?, accent?}] }`
6. **StatRow** — `{ title?, cols?, items:[{label, value, delta?, deltaSuffix?, accent?}] }`
7. **BiometricChart** — `{ label, value?, unit?, delta?, tone?:"accent"|"pos"|"neg"|"warn", data:number[] }`
8. **EnergyTrendLine** — `{ label?, unit?, points:[{t,v}], now?, open?, avg?, ticks?, caption? }`
9. **MarketSentimentWidget** — `{ label?, status?, sentiment:{score:0..100}, tickers:[{symbol, last, changePct, focus?}] }` ("Internal Markets" sentiment block)
10. **InsightCard** — `{ heading?, source?, text, tone?:"accent"|"warn"|"neg" }` (the AI "Counsel" readout)

## SCREENS — tab compositions at full device frame
- **TODAY / DECK**: DailyBriefing → ScheduleMatrix → DeepWorkTimer → GoalProgress.
- **TRENDS**: KpiGrid + StatRow + EnergyTrendLine + MarketSentimentWidget (include an empty/no-data state).
- **MIND**: one or more InsightCards (active AI Counsel) + a lifetime-metrics row.

## SHELL CHROME & OVERLAYS
- **Status LED strip** (fixed top, safe-area): tiny `LOCAL / OFFLINE / LIVE` readout + pulse dot.
- **Generative tab strip**: sticky top, horizontally scrollable, monospace uppercase labels,
  active tab underlined in `--accent`. (This is where TODAY/TRENDS/MIND live — no bottom nav.)
- **Settings gear**: top-right, offset below the notch, **44×44 tap target**.
- **HELP NOW pill**: accent pill, always one tap away, floats bottom-right above the bar.
- **Sync & Refactor bar**: pinned bottom; two states — "◢ Finish day · Sync & Refactor" and
  "✓ Refactor queued · deck rebuilds tomorrow" (accent border when queued).
- **OUTLAST IT** override: full-screen behavioral-override modal, calm dark, a **hold-to-surrender**
  button (a slow bar sweeps L→R over ~1.2s; releasing early cancels).

## Output
Deliver as a design system: each component is its own preview at iPhone width, **dark terminal
theme** primary. Annotate each widget card with its prop contract above. Group cards as
**Foundations / Widgets / Screens / Chrome & Overlays**.
