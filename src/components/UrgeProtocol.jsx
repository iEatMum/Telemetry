// UrgeProtocol.jsx — the most important screen in the app. A full-screen
// takeover that must be reachable in 2 taps (HELP NOW). A 15:00 clock starts
// automatically; texting the accountability partner is one tap. Finishing logs
// a WIN, not a loss.
//
// The steps are no longer fixed: protocolForge deals a personalized sequence
// (interrupt → downshift → reframe → commit) weighted by which steps have been
// on the field for this user's survived urges — and benches the hand they
// slipped on. The deal is logged as an invocation (guardianEngine sidecar); the
// WIN writes the step ids into streak.urgesSurvived so the learning syncs.
// Copy is mirrored to the user's motivational profile via the tone engine.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { forgeProtocol } from '../lib/protocolForge.js'
import { recordInvocation, getInvocations } from '../lib/guardianEngine.js'
import { voice } from '../lib/toneEngine.js'
import { streakDays } from '../lib/dates.js'
import {
  smsLink,
  requestWakeLock,
  releaseWakeLock,
  reacquireWakeLockIfNeeded,
} from '../lib/browser.js'

const DURATION = 15 * 60 // seconds
const TEXT_BODY = 'Urge hit — texting you before I act, like I said I would. Doing the protocol. Check on me in 15.'

export default function UrgeProtocol({ onClose, severity = 'normal' }) {
  const { settings, streak, logUrgeSurvived } = useStore()
  const [remaining, setRemaining] = useState(DURATION)
  const endRef = useRef(null)

  const partners = (settings.partners || []).filter((p) => p.phone)

  // Deal the hand ONCE per open (useMemo, not per render) and log the invocation
  // so the forge can attribute tonight's outcome to exactly these steps.
  const protocol = useMemo(() => {
    const dealt = forgeProtocol({
      severity,
      invocations: getInvocations(),
      streak,
      modules: settings.modules || {},
      hasPartner: partners.length > 0,
    })
    recordInvocation({ steps: dealt.steps.map((s) => s.id), severity })
    return dealt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [done, setDone] = useState(() => protocol.steps.map(() => false))

  // Profile for the tone engine + its params.
  const profile = { streakModel: settings.streakModel, theme: settings.theme }
  const params = {
    days: streakDays(streak.startedAt),
    wins: (streak.urgesSurvived || []).length,
    winsNext: (streak.urgesSurvived || []).length + 1,
  }

  // Auto-start countdown + keep the screen on. The clock is WALL-CLOCK anchored:
  // the protocol literally sends the user away from the phone, and iOS suspends
  // JS timers when the screen is off — so we compute remaining from a real end
  // timestamp and re-sync (plus reacquire the wake lock) when they come back.
  useEffect(() => {
    endRef.current = Date.now() + DURATION * 1000
    requestWakeLock()
    const tick = () => setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)))
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
  }, [])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const passed = remaining === 0

  function finish() {
    // The WIN carries the protocol fingerprint — this is how the forge learns.
    logUrgeSurvived({ steps: protocol.steps.map((s) => s.id), severity })
    onClose()
  }

  function toggle(i) {
    setDone((d) => d.map((v, idx) => (idx === i ? !v : v)))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg pt-safe">
      <div className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 pb-8">
        {/* Countdown */}
        <div className="pt-8 text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-muted">
            {passed ? 'It passed' : 'Outlast it'}
          </div>
          <div
            className={`mt-3 font-clock tnum text-7xl scoreboard ${
              passed ? 'text-ink' : 'text-accent animate-pulse-accent'
            }`}
          >
            {mm}:{ss}
          </div>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
            {passed ? voice(profile, 'urge.survived', params) : voice(profile, 'urge.open', params)}
          </p>
        </div>

        {/* Steps — the forged hand, in arc order */}
        <ol className="mt-8 space-y-3">
          {protocol.steps.map((step, i) => {
            if (step.special === 'partner') {
              return (
                <li key={step.id} className="rounded-2xl border border-accent bg-accent/5 p-4">
                  <div className="flex gap-3">
                    <StepNum n={i + 1} on={done[i]} onClick={() => toggle(i)} />
                    <div className="flex-1">
                      <div className="text-[15px] text-ink">
                        Text {partners.length === 1 ? partners[0].name : 'someone in your corner'}.
                      </div>
                      <div className="mt-0.5 text-xs text-muted">{voice(profile, 'step.commit', params)}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {partners.map((p) => (
                          <a
                            key={p.id}
                            href={smsLink(p.phone, TEXT_BODY)}
                            onClick={() => toggle(i)}
                            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-accent-ink"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
                            </svg>
                            Text {p.name}
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
                  onClick={() => toggle(i)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left"
                >
                  <StepNum n={i + 1} on={done[i]} />
                  <span className={`text-[15px] ${done[i] ? 'text-muted line-through' : 'text-ink'}`}>
                    {step.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="flex-1" />

        {/* Completion — logs a WIN */}
        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={finish}
            className={`w-full rounded-2xl py-4 text-lg font-bold ${
              passed ? 'bg-accent text-accent-ink shadow-glow' : 'border border-accent text-accent'
            }`}
          >
            You made it.
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-sm text-muted">
            Close without logging
          </button>
        </div>
      </div>
    </div>
  )
}

function StepNum({ n, on, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border font-clock text-sm ${
        on ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted'
      }`}
    >
      {on ? '✓' : n}
    </span>
  )
}
