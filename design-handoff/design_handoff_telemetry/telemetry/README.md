# Telemetry — design system

iOS-first daily-discipline app with a perps-terminal skin. **Server-driven UI:**
the backend forges a JSON tree of allow-listed widgets; the client renders it
into tabs. TODAY / TRENDS / MIND are compositions, not routes.

Doctrinal parent: the LOCKED IN design system (`_ds/…`). Telemetry is a sibling
*skin* over the same psychology — it ships its own tokens on purpose; see
`../Telemetry Architecture Spec.dc.html` for the binding rulings (R1–R8).

## Files
- `telemetry.css` — single bundle consumers link (tokens inlined). Granular sources: `tokens/*.css`.
- `Telemetry Design System.dc.html` — the gallery: foundations / widgets / screens / chrome.
- `TelemetryApp.dc.html` — full device shell (390×844, safe areas, tab strip, sync bar, HELP NOW, OUTLAST IT).
- `WidgetHost.dc.html` — the render registry: `{ type, props }` → widget.
- Widgets: DailyBriefing · ScheduleMatrix · DeepWorkTimer · GoalProgress · KpiGrid · StatRow · BiometricChart · EnergyTrendLine · MarketSentimentWidget · InsightCard · EmptyState
- Primitives: DeltaTag · Sparkline · BarMeter · TriStateBox · StatusLED · Chip
- Chrome: StatusStrip · TabStrip · SyncBar · HelpNowPill · OutlastModal

## Theming
`data-theme="terminal" | "zen" | "night_ops"` on any subtree; tokens cascade.
terminal = electric green + glow; zen = light, glow off, more air; night_ops = muted, low glow.

## Rules that override aesthetics
- `--accent` fills are scarce: the day's anchor, one primary action, active tab, HELP NOW.
- `--neg` marks external conditions only — never the person, never a miss, never post-slip.
- Missed = muted + dashed. Reset = data, not verdict. Spiritual items are never scored.
- All numerals: `--font-clock` + tabular figures. Glow comes from theme tokens only.
