# LOCKED IN

A personal daily-discipline app. Built for one. Verse → streak → sprints, offline-first, on your phone.

This is **Phase 1**: Today, Streak (with the full urge protocol), and Sprint. Data lives in your browser (localStorage). Installable as a PWA.

---

## Run it on your computer

Node is already installed for you (in `~/.local/node`, added to your `~/.zshrc`).
Open a terminal in this folder and:

```bash
npm install        # first time only — pulls the libraries
npm run dev         # starts the app at http://localhost:5173
```

Open that URL in your browser. Edit a file, save, and it updates instantly.

To stop it: `Ctrl + C` in the terminal.

Other commands:

```bash
npm run build       # makes the optimized version in dist/ (what gets deployed)
npm run preview     # serves that built version locally, to double-check it
npm run icons       # regenerates the app icons from scripts/gen-icons.mjs
npm run sound       # regenerates the sprint-end sound
```

---

## Get it on your phone (deploy)

You don't have GitHub or Vercel yet — here are both paths. **Option A is the fastest way to your home screen.**

### Option A — Vercel CLI (recommended first)

```bash
npm i -g vercel     # installs the Vercel command
vercel              # first run: it asks you to log in (use email or GitHub),
                    # then asks a few setup questions — press Enter to accept defaults.
                    # It auto-detects Vite, builds, and gives you a URL.
vercel --prod       # publishes to your real (production) URL
```

Then on your iPhone:

1. Open the production URL in **Safari**.
2. Tap the **Share** button → **Add to Home Screen**.
3. It now opens full-screen like a real app, and works offline.

### Option B — GitHub + Vercel (set this up when you're ready for auto-deploys)

1. Make a free account at [github.com](https://github.com) and create an empty repo named `locked-in` (no README — this folder already has one).
2. Connect and push:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/locked-in.git
   git push -u origin main
   ```
3. Make a free account at [vercel.com](https://vercel.com), click **New Project**, import your `locked-in` repo, and **Deploy**. Vercel detects Vite automatically — no settings to change.
4. From then on, every `git push` redeploys the site.

---

## Where things live (your learning map)

Pick one file each session and read it top to bottom.

```
src/
  lib/
    storage.js     ← THE data layer. Every save/load goes through here.
                      (Phase 3 swaps this one file for Supabase.)
    store.jsx      ← React state + actions, backed by storage.js
    dates.js       ← the 3am day-rollover, the live-clock math, calendar grid
    verses.js      ← the 37 daily verses (edit freely — they're just strings)
    browser.js     ← SMS link, notifications, sound, wake-lock, iOS Focus trigger
  screens/
    Today.jsx      ← verse, morning checklist, tasks, stat row
    Streak.jsx     ← race-clock, calendar, reset journal, HELP NOW
    Sprint.jsx     ← the timer + distraction-free takeover + history
    Money.jsx      ← Phase 2 placeholder
    Train.jsx      ← Phase 2 placeholder
  components/
    UrgeProtocol.jsx  ← the full-screen 15-minute protocol
    StreakClock.jsx   ← the scoreboard readout
    SettingsSheet.jsx ← minimal Phase-1 settings
    TabBar.jsx, Sheet.jsx, ui.jsx
```

Design tokens (the colors, the gold accent, dark/light) live in `src/index.css`.

---

## Two honest platform notes

- **Silencing the phone during sprints:** a web app *cannot* block other apps or notifications — that's an OS thing. The "Silence my phone" button triggers an iOS **Shortcut** (one-time setup, explained inside the Sprint tab). The app also keeps the screen awake and takes over full-screen during a sprint.
- **Auto-checking your COROS run:** not possible until Phase 3 (it needs a backend). The plan: COROS already syncs your runs to **Strava**, and in Phase 3 we read Strava to auto-check "Morning run" and pre-fill the Train log. For now, it's a manual tap.

---

## Roadmap

- **Phase 1 (this) — DoD:** it's on your phone's home screen and you complete one full real day on it.
- **Phase 2:** Money, Train, recurring task engine, weekly review, full Settings, JSON export.
- **Phase 3:** Supabase sync (magic-link login) so the same data shows on phone and laptop.

> Don't start Phase 2 until Phase 1's finish line is met. Phases with finish lines are how this ships.
