// GuardianPanel.jsx — the Guardian's review surface.
//
// Explainability is the product: the drift sentinel's assessment is shown as
// its named vectors with the evidence beside each ("data, not verdict"). The
// composite 0-100 number is deliberately NEVER rendered — a single risk score
// invites the same all-or-nothing reading as the banned red/green trackers.
// Below the live read: the urge record (wins AND resets as neutral history —
// the lifetime piles only grow) and what the protocol forge has learned about
// which steps actually work for this user.

import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { useDriftSentinel, getInvocations } from '../lib/guardianEngine.js'
import { stepStats, STEP_LIBRARY } from '../lib/protocolForge.js'
import { streakDays } from '../lib/dates.js'
import { useEntitlement } from '../lib/purchases.js'
import { CoachGate } from '../components/Paywall.jsx'
import { Card, SectionLabel, LedgerNotice, LifetimePile, BarMeter, InfoDot } from '../components/ui.jsx'
import {
  guardStatus,
  requestGuardAuth,
  pickShieldedApps,
  shieldNow,
  liftShield,
  armWindow,
  disarmWindow,
  windowDefaults,
} from '../lib/lockdown.js'
import { notifPermission, enableNotifications } from '../lib/notifications.js'

// ── Reminder primer (P3b) ────────────────────────────────────────────────────
// The raw iOS notification prompt fires exactly once, HERE, after the user has
// read what it's for. Denied gets an honest recovery path, not silence.
function ReminderSection() {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    notifPermission().then(setState)
  }, [])
  if (!state || state === 'web' || state === 'granted') return null
  return (
    <div>
      <SectionLabel className="mb-2 px-1">Reminders</SectionLabel>
      <Card className="px-4 py-3">
        {state === 'denied' ? (
          <p className="text-[0.8125rem] leading-relaxed text-muted">
            Reminders are off for Telemetry, so the Guardian's pre-window note and your block
            reminders can't reach you. iOS Settings → Notifications → Telemetry turns them back on.
          </p>
        ) : (
          <>
            <p className="text-[0.8125rem] leading-relaxed text-muted">
              The Guardian sends ONE quiet note 30 minutes before the window you flagged, plus your
              own block reminders at the times you wrote. Nothing promotional — ever.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setState(await enableNotifications())
                setBusy(false)
              }}
              className="mt-3 w-full rounded-md border border-accent px-4 py-3 font-clock text-xs font-semibold uppercase tracking-widest2 text-accent disabled:opacity-50"
            >
              Enable reminders
            </button>
          </>
        )}
      </Card>
    </div>
  )
}

// ── The Shield (Phase 3c — FREE tier) ────────────────────────────────────────
// User-authored armor: during the window the user flagged, the apps THEY chose
// go quiet. The selection is opaque Apple tokens — Telemetry never learns which
// apps. Lifting the shield is always one tap (a bypass is data, not shame).
// The AI read below is the paid layer; the armor itself is why the app earns
// its place on the phone.
function ShieldSection() {
  const { settings } = useStore()
  const [st, setSt] = useState(null) // null = probing
  const [busy, setBusy] = useState(false)
  const refresh = () => guardStatus().then(setSt)
  useEffect(() => {
    refresh()
  }, [])

  // Default window from the survey's danger window; the inputs stay editable.
  const survey = (() => {
    try {
      return JSON.parse(localStorage.getItem('lockedin:__survey') || 'null')
    } catch {
      return null
    }
  })()
  const dflt = windowDefaults(survey?.dangerWindow, settings.wakeTime)
  const [start, setStart] = useState(dflt.start)
  const [end, setEnd] = useState(dflt.end)

  const act = (fn) => async () => {
    setBusy(true)
    await fn()
    await refresh()
    setBusy(false)
  }
  const hm = (t) => {
    const [h, m] = String(t).split(':').map((n) => parseInt(n, 10) || 0)
    return [h, m]
  }

  let body
  if (!st) {
    body = <p className="px-4 py-3 text-[0.8125rem] text-muted">Checking the shield…</p>
  } else if (!st.available) {
    body = (
      <p className="px-4 py-3 text-[0.8125rem] leading-relaxed text-muted">
        Shields arm on your iPhone: pick the apps that pull at you, and during your window they go
        quiet behind Apple's own screen. Nothing here reaches the App Store build until Apple's
        Family Controls approval lands.
      </p>
    )
  } else if (st.authorization !== 'approved') {
    body = (
      <div className="px-4 py-3">
        <p className="text-[0.8125rem] leading-relaxed text-muted">
          {st.authorization === 'denied'
            ? 'Screen Time access is off. iOS Settings → Screen Time is where it turns back on.'
            : 'One system permission arms the shield — Apple keeps which apps you pick invisible to us.'}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={act(requestGuardAuth)}
          className="mt-3 w-full rounded-md border border-accent px-4 py-3 font-clock text-xs font-semibold uppercase tracking-widest2 text-accent disabled:opacity-50"
        >
          Enable the shield
        </button>
      </div>
    )
  } else {
    body = (
      <div className="divide-y divide-line">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[0.8125rem] text-ink">
            {st.selectionCount > 0 ? `${st.selectionCount} apps shielded` : 'No apps chosen yet'}
            <InfoDot label="How app picking works">
              You pick with Apple's own list. The selection is opaque tokens — Telemetry never learns
              which apps you chose.
            </InfoDot>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={act(pickShieldedApps)}
            className="shrink-0 rounded-md border border-line bg-surface2 px-4 py-2.5 text-[0.8125rem] text-ink disabled:opacity-50"
          >
            {st.selectionCount > 0 ? 'Edit' : 'Choose'}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[0.8125rem] text-ink">
            {st.shieldActive ? 'Shield is UP' : 'Shield is down'}
            <InfoDot label="About the shield">
              During the shield, your chosen apps sit behind Apple's block screen. Lifting it is always
              one tap and always yours — a lift is data, never shame.
            </InfoDot>
          </span>
          <button
            type="button"
            disabled={busy || st.selectionCount === 0}
            onClick={act(st.shieldActive ? liftShield : shieldNow)}
            className={`shrink-0 rounded-md px-4 py-2.5 font-clock text-[0.6875rem] font-semibold uppercase tracking-widest2 disabled:opacity-50 ${
              st.shieldActive ? 'border border-line bg-surface2 text-ink' : 'bg-accent text-accent-ink'
            }`}
          >
            {st.shieldActive ? 'Lift' : 'Shield now'}
          </button>
        </div>
        <div className="px-4 py-3">
          <span className="text-[0.8125rem] text-ink">Arm the danger window nightly</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={st.scheduled}
              aria-label="Window start"
              className="min-w-[112px] rounded-md border border-line bg-surface2 px-1 py-2 text-center font-clock tnum text-[0.8125rem] text-ink outline-none focus:border-accent-deep disabled:opacity-60"
            />
            <span className="font-clock text-[0.6875rem] text-muted">to</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={st.scheduled}
              aria-label="Window end"
              className="min-w-[112px] rounded-md border border-line bg-surface2 px-1 py-2 text-center font-clock tnum text-[0.8125rem] text-ink outline-none focus:border-accent-deep disabled:opacity-60"
            />
            <button
              type="button"
              disabled={busy || st.selectionCount === 0}
              onClick={act(() =>
                st.scheduled
                  ? disarmWindow()
                  : armWindow({
                      startHour: hm(start)[0],
                      startMinute: hm(start)[1],
                      endHour: hm(end)[0],
                      endMinute: hm(end)[1],
                    })
              )}
              className="ml-auto shrink-0 rounded-md border border-line bg-surface2 px-4 py-2.5 font-clock text-[0.6875rem] uppercase tracking-widest2 text-ink disabled:opacity-50"
            >
              {st.scheduled ? 'Disarm' : 'Arm'}
            </button>
          </div>
          {st.scheduled && (
            <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
              Armed — the shield rises and falls on its own inside the window, even with the app closed.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionLabel className="mb-2 px-1">The shield</SectionLabel>
      <Card>{body}</Card>
    </div>
  )
}

const BAND_TONE = { stable: 'text-pos', watch: 'text-warn', critical: 'text-neg' }
const BAND_LINE = {
  stable: 'Conditions steady. Nothing to act on.',
  watch: 'Conditions drifting. One quiet move keeps it that way.',
  critical: 'Multiple signals stacked. The next scheduled block is the move.',
}

function VectorRow({ v }) {
  const tone = !v.evidence ? 'bg-line' : v.score >= 0.6 ? 'bg-neg' : v.score > 0 ? 'bg-warn' : 'bg-pos'
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${tone}`} />
      <span className="flex-1 text-[0.8125rem] text-ink">{v.note}</span>
      {!v.evidence && (
        <span className="font-clock text-[0.6875rem] uppercase tracking-wide text-muted/70">no data</span>
      )}
    </div>
  )
}

export default function GuardianPanel() {
  const { streak } = useStore()
  const drift = useDriftSentinel()
  // The drift sentinel + protocol intelligence ARE the coach (M0.1). The
  // Record stays free — it's the user's own book, never behind the register.
  // The urge protocol itself is untouched by this gate (safety is free).
  const { entitled } = useEntitlement()

  const wins = streak.urgesSurvived || []
  const resets = streak.resets || []
  const days = streakDays(streak.startedAt)
  const stats = stepStats(getInvocations(), streak)
  const learned = Object.entries(stats)
    .map(([id, s]) => ({ ...s, id, step: STEP_LIBRARY.find((x) => x.id === id) }))
    .filter((r) => r.step)
    .sort((a, b) => b.score - a.score)

  // Recent urge moments, newest first — wins and resets interleaved as one
  // neutral timeline. A reset row reads identically calm to a win row.
  const timeline = [
    ...wins.map((w) => ({ at: w.at, kind: 'outlasted' })),
    ...resets.map((r) => ({ at: r.at, kind: 'reset' })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8)

  return (
    <div className="space-y-5">
      {/* The shield — FREE. Armor first, then the paid read below it. */}
      <ShieldSection />

      {/* Priming before any raw iOS prompt; hidden once granted (or on web). */}
      <ReminderSection />

      {/* Live drift read — coach-gated */}
      <div>
        <SectionLabel className="mb-2 px-1">Drift sentinel</SectionLabel>
        {!entitled ? (
          <CoachGate line="The sentinel reads sleep, engagement, and your danger window — and names the drift before it lands." />
        ) : (
          <Card>
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
              <span className={`font-clock text-sm font-semibold uppercase tracking-widest2 ${BAND_TONE[drift?.band] || 'text-muted'}`}>
                {drift ? drift.band : 'reading…'}
              </span>
              {drift?.window?.label && (
                <span className="text-xs text-muted">watch window {drift.window.label}</span>
              )}
            </div>
            {drift ? (
              <>
                <div className="divide-y divide-line/50">
                  {drift.vectors.map((v) => (
                    <VectorRow key={v.key} v={v} />
                  ))}
                </div>
                <p className="border-t border-line px-4 py-3 text-[0.75rem] leading-relaxed text-muted">
                  {BAND_LINE[drift.band]}
                </p>
              </>
            ) : (
              <div className="px-4 py-3">
                <LedgerNotice>Assessing today's signals…</LedgerNotice>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* The record — permanent piles + the neutral timeline */}
      <div>
        <SectionLabel className="mb-2 px-1">The record</SectionLabel>
        <Card className="p-4">
          <div className="flex justify-around">
            <LifetimePile value={days} label="day run" />
            <LifetimePile value={wins.length} label="urges outlasted" />
            <LifetimePile value={resets.length} label="resets · data" />
          </div>
        </Card>
        {timeline.length > 0 && (
          <Card className="mt-3">
            <div className="divide-y divide-line/50">
              {timeline.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  {/* Ledger, not scoreboard: win and reset rows carry IDENTICAL
                      visual weight — only the word differs (BLUEPRINT P-6). */}
                  <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
                    {e.kind}
                  </span>
                  <span className="font-clock tnum text-xs text-muted">
                    {new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(e.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* What the forge has learned — coach-gated (the LEARNING is the coach;
          the urge protocol itself always deals a full hand for free) */}
      <div>
        <SectionLabel className="mb-2 px-1">Protocol intelligence</SectionLabel>
        {!entitled ? (
          <CoachGate line="Every night-page run teaches the forge which steps hold for you — the next deal adapts." />
        ) : learned.length ? (
          <Card className="space-y-3 p-4">
            {learned.map((r) => (
              <BarMeter
                key={r.id}
                label={r.step.label.slice(0, 44)}
                value={Math.round(r.score * 100)}
                max={100}
                tone={r.score >= 0.5 ? 'accent' : 'warn'}
                right={`${r.wins}W · ${r.losses}L`}
              />
            ))}
          </Card>
        ) : (
          <LedgerNotice>
            No protocol history yet. Each Outlast It run teaches the forge which steps hold for you —
            the next deal adapts.
          </LedgerNotice>
        )}
      </div>
    </div>
  )
}
