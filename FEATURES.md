# LOCKED IN — Features & Rules

The living source of truth for what the app does and the exact rules it runs on.
(How it's built: see **Tech stack & data schema** at the bottom. What's next: `BACKLOG.md`.
Why each feature works on the brain: `PSYCHOLOGY.md`.)

Built for exactly one user: a 19-year-old Christian college athlete (400m/800m,
reports to Fresno State in August) rebuilding his routine. Private. Offline-first.
No guilt language anywhere. **A reset is data, not failure.**

---

## The day, as the app sees it

- The **app day rolls over at 3:00am**, not midnight. Ticking the checklist at
  12:30am still counts for the day you're finishing — you haven't slept yet.
- The daily verse and reading stay **stable all day** and change with the date.

## 🏠 Today

| Piece | What it does | The rule |
|---|---|---|
| Greeting + date | Time-aware greeting, uses your name | — |
| Streak chip 🔥 | Clean-day count, always visible | Whole days since the clock started |
| Daily verse | 37 verses (WEB translation, public domain) on discipline, purity, the race | Rotates by day-of-year |
| Today's reading | Current section of your reading plan, "Mark read →" advances | Seeded John 1–21; extend in Settings |
| Morning protocol | Wake · Prayer/Bible 15min · Morning run · Phone out of bedroom | Tri-state: tap = ✓ done → tap = ✕ missed → tap = clear. Resets 3am. |
| Today's tasks | The recurring-task engine (below) | Due tasks only — no clutter |
| Stat row | Streak · sprints today · $ this month · miles this week | Week = Sunday-start (matches Train) |

**The wake rule (written down so you never negotiate at 6:46am):**
Wake target is 6:45. **Up and out of bed by 7:00 = ✓ done.** Past 7:00 = ✕ missed.
A miss is one data point, never a verdict. *Never miss twice.*

**Phone-down rule:** phone out of the bedroom by 10:15pm (editable in Settings).
Same grace logic: docked by 10:30 = ✓.

## 🔥 Streak

- **Race-clock readout** — `DAYS : HRS : MIN` + ticking seconds. The signature element.
- **Best** — your longest run ever; never reads less than the current one.
- **Log today clean** — fills today's calendar cell (idempotent).
- **Survived an urge** — counts **wins**, with a running total. Wins are data too.
- **Month calendar** — clean days filled; reset days dotted; browse past months.
- **Pattern readout** — "Most resets: night · phone · bored." Computed, not judged.
- **Log a reset** — a 20-second **forced pause** before confirm. Journal: time,
  place, device, feeling (bored / stressed / couldn't sleep / autopilot). Banks
  your best, restarts the clock. The streak resets; **the data compounds.**
- **HELP NOW** — fixed on screen, opens the Urge Protocol in ≤2 taps from anywhere.

## 🚨 Urge Protocol (full-screen takeover)

15:00 countdown starts itself. Steps, in order:
1. Put the phone down. Leave the room.
2. 20 pushups. Now.
3. **Text your people** — one tap per partner, pre-filled: *"Urge hit. Doing the
   protocol. Check on me in 15."*
4. Get outside for 10 minutes.
5. The urge crests and dies in 10–15 min. Outlast it.

Screen stays awake the whole time. **"You made it."** logs a survived urge — a win.

## ⏱️ Sprint

- 20 / 25-min presets, optional label, **full-screen distraction-free takeover**.
- Screen wake-lock; **"Silence my phone"** fires your iOS Focus Shortcut.
- Finish → sound + notification, auto-offer of a 5-min break.
- **Daily target: 6 dots.** Last-7-days bar chart.
- Timer math is wall-clock anchored: backgrounding the app can't drift it.

## 💵 Money

- **The pile** — lifetime banked, the boldest number in the app. It only goes up.
- Month card — earned/goal, progress bar, remaining, days left, **required $/day**,
  and a **run-rate projection** ("at this pace: $X by month-end").
- Log income: amount · source (Job / Roblox / Other) · date. Per-source totals.

## 🏃 Train

- **Fresno State countdown** (editable date).
- Session log: type (Easy/Workout/Long/Strides/Lift/Cross), miles, minutes →
  **auto-pace**, RPE 1–10, **shoe** (mileage tracked per shoe), **warm-up done**, note.
- Weekly mileage + last-4-weeks bars + **>15% jump flag** ("build gradually").
- **The long run anchors the week** — the Sunday Debrief checks it specifically.

## 📋 Recurring task engine

Task = `{ title, cat, recurrence, nextDue, history }` ·
Categories: Faith / Run / Work / Life / Body ·
Recurrence: one-time / daily / weekly(day) / every-N(days|months).

- Due tasks surface on Today; completing **logs history and reschedules**.
- **Skip** logs a *missed* — also data.
- **Push to tomorrow** — allowed **once** per task. The push is logged. The Morning
  Protocol can never be pushed.
- Seeds: creatine (daily), clean room (Sat), laundry (Sun), car check (monthly),
  nap after long run (Sun).

## 📝 Sunday Debrief (weekly review)

Banner on Today every Sunday; always reachable from Settings. Under 10 minutes:
1. **Auto-stats** — clean days, sprints, $, miles, **long run ✓/–**.
2. **What the data says** — your week's done/missed record, computed for you.
3. Three questions: *What worked? What broke? One change for next week.*
4. Next Sunday opens with last week's "one change" at the top.
5. **One-tap JSON backup** lives in the Debrief — weekly backup rides the weekly habit.

## ⚙️ Settings

Name · wake time · phone-down time · monthly goal · report date ·
**accountability partners (multiple — they power HELP NOW)** · shoes ·
reading plan additions · iOS Focus shortcut name ·
**Export JSON** · **Import JSON** (restore a backup) · wipe-all (double-confirmed).

---

## Platform truths (so nobody re-litigates them)

- A web app **cannot** silence the phone or block other apps. The Focus-Shortcut
  button + full-screen takeover + wake-lock is the honest best on iOS. Hard
  app-blocking needs the Phase-4 native wrapper.
- iOS does not support web `Notification` pop-ups from the PWA reliably; the
  sprint-end **sound** is the primary signal, and the timer is wall-clock safe.
- COROS auto-sync arrives in **Phase 3** via Strava + backend, not before.
- All data lives **on the device** until Phase 3 sync. Export weekly (the Debrief
  hands it to you).

## Tech stack & data schema

**Stack:** Vite + React 18, plain JavaScript (no TypeScript), Tailwind CSS,
`vite-plugin-pwa` (installable, offline). No backend, no analytics, no accounts.
Every byte of data goes through `src/lib/storage.js` (localStorage today,
Supabase in Phase 3 — a one-file swap).

**Stores** (each a localStorage key, JSON):

```js
settings  { name, wakeTime, bedTime, moneyGoal, partners[{id,name,phone}],
            shoes[], reportDate, focusShortcutName, schemaVersion }
streak    { startedAt, cleanDates[], resets[{at,time,place,device,feeling}],
            urgesSurvived[{at}], bestSeconds }
sprints   [{ date, count, labels[] }]
income    [{ id, date, amount, source }]
runs      [{ id, date, type, miles, minutes, rpe, note, shoe, warmup }]
tasks     [{ id, title, cat, recurrence{type,...}, nextDue, done,
             history[{date,status:'done'|'missed'|'pushed'}] }]
reviews   [{ weekOf, stats{}, worked, broke, oneChange }]
checklist { 'YYYY-MM-DD': { wake|prayer|run|phone: 'done'|'missed' } }
reading   { index, plan[], history[{label,at}] }
```

**Phases:** 1 ✅ shipped · 2 ✅ shipped · 3 = Supabase sync + the unfakeable
accountability layer (Shortcuts signals → rules engine → push + partner SMS) ·
4 (only if needed) = native wrapper for HealthKit sleep + Screen Time blocking.
