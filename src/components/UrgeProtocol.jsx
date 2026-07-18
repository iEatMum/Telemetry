// UrgeProtocol.jsx — OUTLAST IT. The most important screen in the app: a
// full-screen behavioral override, reachable in one tap (HELP NOW).
//
// Contract (design handoff OutlastModal + spec §8, Split Ledger §invert):
//   • ALWAYS the private night page, regardless of the active theme — the
//     container carries data-invert, which re-points every token to the
//     skin's ink-dark family (the stopwatch inversion) and cascades down.
//   • The ride clock auto-starts and counts UP (survival framing — the
//     15-minute crest unlocks the survived copy); the lifetime pile holds the
//     dominant position; steps are tappable STRICTLY IN ORDER (current
//     row = surface-2 + accent-deep border + NOW chip; done = muted + check).
//   • Staying is one tap — once the ride is real: "I stayed — close this"
//     arms at STAY_ARM_SECONDS so the lifetime pile can't be inflated by a
//     drive-by tap (the ✕ escape stays free and logs nothing).
//     Surrendering costs 1.2 deliberate seconds: the hold bar sweeps L→R,
//     releasing early cancels at zero cost. Muted styling — not red, not accent.
//   • Stayed close: POSITION HELD — the lifetime pile +1 IS the ceremony.
//   • Slipped close: one voice for all profiles (urge.slipped), pile in plain
//     text, STILL YOURS. No red anywhere on this screen (R2).
//
// The steps come from protocolForge (a personalized arc, benching the hand he
// slipped on); the deal is logged as an invocation, a WIN writes the step ids
// into streak.urgesSurvived, and a surrender logs the reset — which is exactly
// the signal resolveOutcomes() reads (reset within 6h of invocation), so the
// forge learns without any engine change.

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { forgeProtocol } from '../lib/protocolForge.js'
import { recordInvocation, getInvocations } from '../lib/guardianEngine.js'
import { voice } from '../lib/toneEngine.js'
import { streakDays } from '../lib/dates.js'
import { verseForDay } from '../lib/verses.js'
import { HoldButton } from './ui.jsx'
import { sealCommit } from '../lib/haptics.js'
import {
  smsLink,
  requestWakeLock,
  releaseWakeLock,
  reacquireWakeLockIfNeeded,
} from '../lib/browser.js'

const DURATION = 15 * 60 // seconds

// m:ss for the arm countdown — a real clock, so 60s reads "1:00", not "0:60".
const armCountdown = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
// "I stayed" arms after a real ride, not a drive-by tap — an urge outlasted in
// 20 seconds isn't one, and the lifetime pile only means something if every
// unit on it was earned. The quiet ✕ stays free for accidental opens (nothing
// logged either way). DEV shortens the clock so the flow stays walkable.
const STAY_ARM_SECONDS = import.meta.env.DEV ? 3 : 60
const TEXT_BODY = 'Urge hit — texting you before I act, like I said I would. Doing the protocol. Check on me in 15.'

// ── Ride persistence (MASTERPLAN P1 · crisis path) ───────────────────────────
// The protocol SENDS the user away from the phone — "phone in another room" is
// step one — and iOS is free to kill the process while they're gone. Before
// this sidecar, coming back meant a blank deck: ride clock gone, steps gone, a
// fresh invocation logged if they reopened HELP. Now the live ride (start
// instant, the dealt hand, progress) survives process death; the shell reopens
// it on boot and the clock re-syncs off the wall clock. An hour-old ride is
// treated as an abandoned crash, not resumed — nobody rides one urge for an
// hour, and resurrecting last night's crisis screen at breakfast would be its
// own kind of harm.
const RIDE_KEY = 'lockedin:__urge'
const RIDE_TTL_MS = 60 * 60 * 1000

export function activeRide() {
  try {
    const raw = localStorage.getItem(RIDE_KEY)
    if (!raw) return null
    const r = JSON.parse(raw)
    if (!r || typeof r.startedAt !== 'number' || !Array.isArray(r.steps) || !r.steps.length) throw new Error('shape')
    if (Date.now() - r.startedAt > RIDE_TTL_MS) throw new Error('stale')
    return r
  } catch {
    try {
      localStorage.removeItem(RIDE_KEY)
    } catch {
      /* already gone */
    }
    return null
  }
}
export const hasActiveRide = () => activeRide() !== null
function saveRide(r) {
  try {
    localStorage.setItem(RIDE_KEY, JSON.stringify(r))
  } catch {
    /* quota — the ride still works in memory */
  }
}
function clearRide() {
  try {
    localStorage.removeItem(RIDE_KEY)
  } catch {
    /* ignore */
  }
}

export default function UrgeProtocol({ onClose, severity = 'normal' }) {
  const { settings, streak, logUrgeSurvived, logReset } = useStore()
  // The ride clock counts UP (Split Ledger 03 — a dive bezel measures survival,
  // not deadline). DURATION is the crest: past it, the survived copy unlocks.
  const [elapsed, setElapsed] = useState(0)
  // A crashed-but-fresh ride resumes exactly where it stood; otherwise HELP
  // opens on the LANDING frame — a still page that starts nothing. The old
  // behavior (tap HELP → a running 15-minute clock + a logged invocation) meant
  // an accidental tap polluted the forge's outcome data and greeted a curious
  // user with a countdown already judging them.
  const [ride, setRide] = useState(() => activeRide())
  const [phase, setPhase] = useState(ride ? 'active' : 'landing') // landing | active | stayed | slipped
  // The pile as rendered on a close screen — captured at the moment of the
  // outcome so the ceremony number doesn't shift under a re-render.
  const [closePile, setClosePile] = useState(0)

  const partners = (settings.partners || []).filter((p) => p.phone)
  const [pinged, setPinged] = useState({})

  // Strictly-in-order progression: stepDone = how many steps are complete; only
  // the step at that index is tappable. "Set aside" steps count as passed but
  // keep their own mark. Both survive process death inside the ride sidecar.
  const [stepDone, setStepDone] = useState(() => (ride && ride.stepDone) || 0)
  const [skipped, setSkipped] = useState(() => new Set((ride && ride.skipped) || []))

  // Deal the hand ONCE — at "Start the ride", never on mount — and log the
  // invocation so the forge can attribute tonight's outcome to exactly these
  // steps. A resumed ride reuses its original hand and logs nothing new.
  function begin() {
    const dealt = forgeProtocol({
      severity,
      invocations: getInvocations(),
      streak,
      modules: settings.modules || {},
      hasPartner: partners.length > 0,
    })
    recordInvocation({ steps: dealt.steps.map((s) => s.id), severity })
    const fresh = {
      startedAt: Date.now(),
      severity,
      steps: dealt.steps.map(({ id, label, special }) => ({ id, label, special })),
      stepDone: 0,
      skipped: [],
    }
    saveRide(fresh)
    setRide(fresh)
    setStepDone(0)
    setSkipped(new Set())
    setElapsed(0)
    setPhase('active')
  }

  const steps = (ride && ride.steps) || []

  // Profile for the tone engine + its params.
  const profile = { streakModel: settings.streakModel, theme: settings.theme }
  const params = {
    days: streakDays(streak.startedAt),
    wins: (streak.urgesSurvived || []).length,
    winsNext: (streak.urgesSurvived || []).length + 1,
  }

  // The ride clock + screen wake, alive only once a ride exists. The clock is
  // WALL-CLOCK anchored to the ride's persisted start instant: the protocol
  // literally sends the user away from the phone, iOS suspends JS timers when
  // the screen is off (or kills the process outright) — so elapsed is computed
  // from ride.startedAt and re-synced (plus the wake lock reacquired) when they
  // come back, across suspends AND relaunches.
  const startedAt = ride ? ride.startedAt : null
  useEffect(() => {
    if (!startedAt) return undefined
    requestWakeLock()
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000)))
    tick()
    const onVis = () => {
      reacquireWakeLockIfNeeded()
      tick()
    }
    document.addEventListener('visibilitychange', onVis)
    const id = setInterval(tick, 1000)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      releaseWakeLock()
    }
  }, [startedAt])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const passed = elapsed >= DURATION

  function advance(i, viaSkip = false) {
    if (i !== stepDone) return // strictly in order
    const nextSkipped = viaSkip ? new Set(skipped).add(steps[i].id) : skipped
    if (viaSkip) setSkipped(nextSkipped)
    setStepDone(i + 1)
    if (ride) saveRide({ ...ride, stepDone: i + 1, skipped: [...nextSkipped] })
  }

  function stay() {
    // The WIN carries the protocol fingerprint — this is how the forge learns.
    setClosePile(params.winsNext)
    logUrgeSurvived({ steps: steps.map((s) => s.id), severity })
    sealCommit() // "I stayed" is a commitment — the one sanctioned success haptic
    clearRide()
    setPhase('stayed')
  }

  function surrender() {
    // The reset IS the loss signal (resolveOutcomes reads reset-within-6h of the
    // invocation) — component wiring only, no engine change. Data, not verdict.
    setClosePile(params.wins)
    logReset({ context: 'outlast' })
    clearRide()
    setPhase('slipped')
  }

  // The quiet ✕: logs nothing AND leaves no ride behind — an abandoned open
  // must not resurrect itself as a "resumed crisis" on the next boot.
  function quietClose() {
    clearRide()
    onClose()
  }

  // ── Close screens ──────────────────────────────────────────────────────────
  if (phase === 'stayed') {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="font-clock text-[0.75rem] uppercase tracking-[0.25em] text-accent">
            Position held
          </div>
          <div className="scoreboard mt-6 font-clock tnum text-[3.5rem] leading-none text-accent">
            {closePile}
          </div>
          <div className="mt-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
            Urges outlasted
          </div>
          <p className="mx-auto mt-6 max-w-xs text-sm leading-relaxed text-muted">
            Urges crest and pass — you stayed.
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink">
            {voice(profile, 'urge.survived', { ...params, wins: closePile, winsNext: closePile + 1 })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-md bg-accent py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-accent-ink"
        >
          Back to the deck
        </button>
        {/* Outlasting an urge does not mean out of danger — keep 988 present on
            this screen too, not only on the active ride and the slip. */}
        <CrisisLine />
      </Shell>
    )
  }

  if (phase === 'slipped') {
    // ONE voice for all profiles; the pile stays in plain text; no red (R2).
    // The minute after a slip is the highest-risk moment in the app: the
    // header speaks person-first (no trading-desk register here), and the
    // crisis line STAYS on this screen — it must not vanish exactly when it
    // matters most.
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="font-clock text-[0.75rem] uppercase tracking-[0.25em] text-muted">
            Logged · the book stays open
          </div>
          <div className="mt-6 font-clock tnum text-[3.5rem] leading-none text-ink">{closePile}</div>
          <div className="mt-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
            Urges outlasted · still yours
          </div>
          <p className="mx-auto mt-6 max-w-xs text-sm leading-relaxed text-ink">
            {voice(profile, 'urge.slipped', params)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-md bg-surface2 py-4 font-clock text-sm uppercase tracking-widest2 text-ink"
        >
          Back to the deck
        </button>
        <CrisisLine />
      </Shell>
    )
  }

  // ── The landing frame ──────────────────────────────────────────────────────
  // HELP's front door (P1): a still page. No clock runs, nothing is logged,
  // until "Start the ride" — so an accidental or curious tap costs nothing and
  // teaches the room. The crisis line is here too: someone who came for the
  // hotline shouldn't have to start a protocol to find it.
  if (phase === 'landing') {
    return (
      <Shell label="Help — the night page">
        <button
          type="button"
          onClick={quietClose}
          aria-label="Close"
          className="absolute right-2 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted pt-safe"
        >
          ✕
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="font-clock text-[0.75rem] uppercase tracking-[0.25em] text-muted">
            <span className="text-accent" aria-hidden>
              ●
            </span>{' '}
            The night page
          </div>
          <h1 className="mx-auto mt-6 max-w-xs text-[1.5rem] font-semibold leading-tight text-ink">
            You made it here. That was the hard part.
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-muted">
            An urge is a wave — it crests and it passes. The ride deals you a few concrete moves and a
            15-minute clock to outlast it. Nothing starts, and nothing is written, until you say so.
          </p>
          {params.wins > 0 && (
            <div className="mt-6 flex items-baseline gap-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
              <span>Urges outlasted</span>
              <span className="tnum text-base text-accent">{params.wins}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={begin}
          className="mt-8 w-full rounded-md bg-accent py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-accent-ink"
        >
          Start the ride
        </button>
        <CrisisLine />
      </Shell>
    )
  }

  // ── The active override ────────────────────────────────────────────────────
  return (
    <Shell>
      {/* Quiet escape (no logging, no ride left behind) — an accidental open
          must not force a verdict */}
      <button
        type="button"
        onClick={quietClose}
        aria-label="Close"
        className="absolute right-2 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted pt-safe"
      >
        ✕
      </button>

      {/* The bezel — the ride counts UP; the LIFETIME pile holds the dominant
          position (the number a reset can never touch), this ride is the line
          beneath it. Ink numerals; the accent stays with commitment. */}
      <div className="pt-8 text-center">
        <div className="font-clock text-[0.75rem] uppercase tracking-[0.25em] text-muted">
          <span className="text-accent" aria-hidden>
            ●
          </span>{' '}
          Outlast it · <span className="text-muted">urge protocol</span>
        </div>
        {/* 11px floor on the whole night page (P1 a11y): the reader is
            dysregulated and possibly in the dark — no micro-type here. */}
        <div className="mt-6 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
          Outlasted — lifetime
        </div>
        <div className="mt-1.5 font-clock tnum text-[3.5rem] font-medium leading-none text-ink">
          {params.wins}
        </div>
        <div
          className={`mt-4 font-clock tnum text-3xl leading-none text-ink ${
            passed ? '' : 'animate-pulse-accent'
          }`}
        >
          {mm}:{ss}
        </div>
        <div className="mt-1 font-clock text-[0.6875rem] uppercase tracking-widest2 text-faint">
          this ride
        </div>
        <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
          {/* While the ride is still open we FORECAST — never declare "it passed"
              before the user confirms, or a slip at minute 17 curdles a victory
              they were told they'd already won. The verdict waits for the stayed
              screen, after "I stayed". */}
          {passed
            ? 'Urges crest and pass — you’re likely through the worst of it now.'
            : voice(profile, 'urge.open', params)}
        </p>
        {/* The win lands beside the pile it grows (BLUEPRINT P-8) — the
            lifetime number is the one a reset can never touch. */}
        {passed && (
          <div className="mt-4 flex items-baseline justify-center gap-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
            <span>Urges outlasted</span>
            <span className="tnum text-base text-accent">{params.wins}</span>
            <span>· this one makes {params.winsNext}</span>
          </div>
        )}
      </div>

      {/* Steps — the forged hand, strictly in order */}
      <ol className="mt-8 space-y-2.5">
        {steps.map((step, i) => {
          const isDone = i < stepDone
          const isNow = i === stepDone
          const wasSkipped = skipped.has(step.id)
          if (step.special === 'partner') {
            return (
              <li
                key={step.id}
                className={`min-h-[48px] rounded-md border p-4 ${
                  isNow ? 'border-accent-deep bg-surface2' : 'border-line bg-surface'
                } ${!isNow && !isDone ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <StepMark n={i + 1} done={isDone} now={isNow} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[0.9375rem] ${isDone ? 'text-muted' : 'text-ink'}`}>
                        Text {partners.length === 1 ? partners[0].name : 'someone in your corner'}.
                      </span>
                      {isNow && <NowChip />}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {voice(profile, 'step.commit', params)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {partners.map((p) => (
                        <a
                          key={p.id}
                          href={isNow || isDone ? smsLink(p.phone, TEXT_BODY) : undefined}
                          onClick={() => {
                            if (!isNow && !isDone) return
                            setPinged((m) => ({ ...m, [p.id]: true }))
                            advance(i)
                          }}
                          aria-disabled={!isNow && !isDone}
                          className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-medium ${
                            isNow
                              ? 'bg-accent text-accent-ink'
                              : 'bg-surface2 text-muted pointer-events-none'
                          } ${isDone ? 'pointer-events-auto bg-surface2 text-ink' : ''}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
                          </svg>
                          {pinged[p.id] ? `Sent · ${p.name} ✓` : `Text ${p.name}`}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            )
          }
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => advance(i)}
                disabled={!isNow}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-md border p-3.5 text-left ${
                  isNow
                    ? 'border-accent-deep bg-surface2'
                    : isDone
                      ? 'border-line bg-surface'
                      : 'border-line bg-surface opacity-60'
                }`}
              >
                <StepMark n={i + 1} done={isDone} now={isNow} skipped={wasSkipped} />
                <span className="flex-1">
                  <span
                    className={`block text-[0.9375rem] ${
                      isDone ? (wasSkipped ? 'text-muted' : 'text-muted line-through') : 'text-ink'
                    }`}
                  >
                    {step.label}
                  </span>
                  {/* The verse step SHOWS the verse — "read tonight's verse"
                      with no verse was an instruction into a void. Same daily
                      verse as the deck's card (verseForDay), faith-gated
                      upstream by the forge. */}
                  {step.id === 'verse' && (isNow || isDone) && (
                    <span className="mt-1.5 block text-[0.8125rem] leading-relaxed text-muted">
                      “{verseForDay().text}” — {verseForDay().ref}
                    </span>
                  )}
                </span>
                {isNow && <NowChip />}
              </button>
            </li>
          )
        })}
      </ol>

      {/* "Can't do this one" (P1): a step you can't take right now — no partner
          signal, a shared room at 2am, a body that won't do pushups tonight —
          must not wall off the rest of the ladder. Setting it aside advances
          the ride and marks the step —, not ✓: the book records what happened,
          and an unworkable step is data for the forge, never a fault. */}
      {stepDone < steps.length && (
        <button
          type="button"
          onClick={() => advance(stepDone, true)}
          className="mt-2.5 min-h-[44px] w-full rounded-md px-3 text-left font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted"
        >
          Can’t do this one — set it aside
        </button>
      )}

      <div className="flex-1" />

      {/* Exits — the WIN arms after a real ride (STAY_ARM_SECONDS; the pile is
          only worth what each unit cost); logging the slip costs 1.2 deliberate
          seconds. "Log the slip" is deliberate language: the hold records an
          entry in the book (tape, not judge) — it is never a surrender. An
          accidental open still leaves free via ✕, which logs nothing. */}
      <div className="mt-8 space-y-2.5">
        {/* While unarmed, the accessible name is STABLE ("unlocks after the
            first minute") so a screen reader isn't re-read a ticking countdown
            every second; the visible label still ticks. The live region below
            announces the moment the close arms. */}
        <button
          type="button"
          onClick={stay}
          disabled={elapsed < STAY_ARM_SECONDS}
          aria-label={
            elapsed < STAY_ARM_SECONDS
              ? 'I stayed — unlocks after the first minute of the ride'
              : undefined
          }
          className={`w-full rounded-md py-4 font-clock text-sm font-semibold uppercase tracking-widest2 disabled:opacity-50 ${
            passed ? 'bg-accent text-accent-ink shadow-glow' : 'border border-accent text-accent'
          }`}
        >
          <span aria-hidden={elapsed < STAY_ARM_SECONDS || undefined}>
            {elapsed < STAY_ARM_SECONDS
              ? `Ride it — closes in ${armCountdown(STAY_ARM_SECONDS - elapsed)}`
              : 'I stayed — close this'}
          </span>
        </button>
        <span role="status" className="sr-only">
          {elapsed >= STAY_ARM_SECONDS ? '"I stayed" is ready.' : ''}
        </span>
        <HoldButton onComplete={surrender}>Hold to log the slip</HoldButton>
      </div>

      <CrisisLine />
    </Shell>
  )
}

// Crisis line — this app is a discipline tool, not crisis care. The real
// resource is one tap away on the exact screens where it's needed: the active
// ride, the stayed screen, AND the minute after a logged slip. "Call" and
// "text" are SEPARATE links to real handlers — 988 supports both, and someone
// who can't speak (a shared room, too dysregulated) must be able to text.
function CrisisLine() {
  return (
    <p className="mt-6 pb-2 text-center text-xs leading-relaxed text-muted">
      In crisis, or thinking about hurting yourself?{' '}
      <a href="tel:988" className="text-ink underline decoration-line underline-offset-2">
        Call 988
      </a>{' '}
      or{' '}
      <a href="sms:988" className="text-ink underline decoration-line underline-offset-2">
        text 988
      </a>{' '}
      (US, free, 24/7) · outside the US:{' '}
      <a
        href="https://findahelpline.com"
        target="_blank"
        rel="noreferrer"
        className="text-ink underline decoration-line underline-offset-2"
      >
        findahelpline.com
      </a>
    </p>
  )
}

// The always-calm container: data-invert re-points every token to the skin's
// ink-dark night page no matter what the app is wearing (calm-dark forcing).
// Dialog manners (mirror LegalSheet): role=dialog + aria-modal so VoiceOver can't
// wander into the deck behind the most safety-critical screen, and focus lands
// in the sheet on open. No Escape binding here — the ✕ is the one deliberate
// exit; an accidental Escape must not dismiss the night page mid-urge.
function Shell({ children, label = 'Outlast it — the night page' }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      data-invert
      className="fixed inset-0 z-50 overflow-y-auto bg-bg text-ink outline-none pt-safe"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-app flex-col px-5 pb-8">
        {children}
      </div>
    </div>
  )
}

function StepMark({ n, done, now, skipped }) {
  // A set-aside step wears — in muted, not the accent ✓: passed, not performed.
  return (
    <span
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border font-clock text-[0.8125rem] ${
        done
          ? skipped
            ? 'border-line text-muted'
            : 'border-line text-accent'
          : now
            ? 'border-accent-deep text-ink'
            : 'border-line text-muted'
      }`}
      aria-hidden
    >
      {done ? (skipped ? '—' : '✓') : n}
    </span>
  )
}

function NowChip() {
  return (
    <span className="rounded border border-accent-deep px-1.5 py-0.5 font-clock text-[0.6875rem] uppercase tracking-widest2 text-accent">
      now
    </span>
  )
}
