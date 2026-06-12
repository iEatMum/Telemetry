// UrgeProtocol.jsx — the most important screen in the app. A full-screen
// takeover that must be reachable in 2 taps (Streak → HELP NOW). A 15:00 clock
// starts automatically; the steps are fixed and in order; texting the
// accountability partner is one tap. Finishing logs a WIN, not a loss.

import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import {
  smsLink,
  requestWakeLock,
  releaseWakeLock,
} from '../lib/browser.js'

const DURATION = 15 * 60 // seconds
const TEXT_BODY = 'Urge hit. Doing the protocol. Check on me in 15.'

export default function UrgeProtocol({ onClose }) {
  const { settings, logUrgeSurvived } = useStore()
  const [remaining, setRemaining] = useState(DURATION)
  const [done, setDone] = useState([false, false, false, false, false])

  // Auto-start countdown + keep the screen on for the full 15 minutes.
  useEffect(() => {
    requestWakeLock()
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => {
      clearInterval(id)
      releaseWakeLock()
    }
  }, [])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const passed = remaining === 0

  function finish() {
    logUrgeSurvived()
    onClose()
  }

  function toggle(i) {
    setDone((d) => d.map((v, idx) => (idx === i ? !v : v)))
  }

  const partners = (settings.partners || []).filter((p) => p.phone)

  const steps = [
    'Put the phone down. Leave the room.',
    '20 pushups. Now.',
    null, // rendered specially — the text button
    'Get outside for 10 minutes.',
    'The urge crests and dies in 10–15 min. Outlast it.',
  ]

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
            {passed
              ? 'The urge crested and passed. That was always going to happen. You stayed.'
              : 'You are not your urge. Work the steps top to bottom.'}
          </p>
        </div>

        {/* Steps */}
        <ol className="mt-8 space-y-3">
          {steps.map((text, i) => {
            if (i === 2) {
              return (
                <li key="text" className="rounded-2xl border border-accent bg-accent/5 p-4">
                  <div className="flex gap-3">
                    <StepNum n={3} on={done[2]} onClick={() => toggle(2)} />
                    <div className="flex-1">
                      <div className="text-[15px] text-ink">
                        Text {partners.length === 1 ? partners[0].name : 'someone in your corner'}.
                      </div>
                      {partners.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {partners.map((p) => (
                            <a
                              key={p.id}
                              href={smsLink(p.phone, TEXT_BODY)}
                              onClick={() => toggle(2)}
                              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-accent-ink"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
                              </svg>
                              Text {p.name}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-muted">
                          Add a partner's number in Settings for one-tap texting.
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left"
                >
                  <StepNum n={i + 1} on={done[i]} />
                  <span className={`text-[15px] ${done[i] ? 'text-muted line-through' : 'text-ink'}`}>
                    {text}
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
