# Telemetry — Split Ledger design system
The SHIPPED truth as of 2026-07-18 (repo commit fb8a410). The old "LOCKED IN"
terminal/gold era is gone — the brand pivoted to **Telemetry** (manila paper,
carbon ink, one lane-red seal) and this project now mirrors the app.

- `tokens/` — the CSS contract (copied from src/index.css; the repo is canonical).
- `guidelines/` — colors, type, motion, voice.
- `components/` — canonical previews of the shipped surfaces.
- `brief/` — the round-2 mandate: simplify, commission real art, sanctioned motion.

Regenerate from the repo with `python3 design-sync/build.py` and re-push via
DesignSync. Never edit tokens here first — the app's src/index.css leads.
