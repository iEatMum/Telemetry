// Paywall.jsx — the coach's contract page (CONSTITUTION M0.2/M3).
//
// Shown only when the user reaches for a locked coach surface — never at first
// launch (the book earns trust before the register opens). Ledger voice, one
// page: what the coach reads, the two plans (annual pushed — "a year on the
// book"), the seal, the restore line, and the promise that the book itself is
// free forever. Lane-red appears exactly once: the seal.
//
// CoachGate (exported below) is the quiet locked card every gated surface
// renders in place of coach content — it opens this sheet via the same
// window-event idiom as the night page ('telemetry:open-paywall', owned by
// App.jsx so the sheet covers every surface).

import { useEffect, useRef, useState } from 'react'
import { PLANS, getEntitlement, getLocalizedPlans, hasLapsed, purchase, restore, useEntitlement } from '../lib/purchases.js'
import { openLegal } from './LegalSheet.jsx'
import { useModalDismiss } from '../lib/useModalDismiss.js'
import { track } from '../lib/analytics.js'

export function openPaywall() {
  window.dispatchEvent(new Event('telemetry:open-paywall'))
}

// One source for the trial length across the paywall + every gate (G4).
const TRIAL_DAYS = 7

// Human labels for the onboarding danger-window key, for the personalized header.
const DANGER_LABEL = {
  'post-wake': 'right after waking',
  'midday-slump': 'the afternoon slump',
  evening: 'after dinner',
  'late-night': 'late night',
}

/** Build a line from the user's OWN onboarding answers, or null. Never invents. */
function personalLine() {
  try {
    const survey = JSON.parse(localStorage.getItem('lockedin:__survey') || '{}')
    const dw = DANGER_LABEL[survey.dangerWindow]
    const witness = survey && survey.stake && survey.stake.target && survey.stake.target.name
    if (dw && witness) return `You flagged ${dw} as your danger window and put ${witness} in your corner. The coach reads both.`
    if (dw) return `You flagged ${dw} as your danger window. The coach reads what happens around it.`
    if (witness) return `${witness} is in your corner. The coach reads the week you show them.`
    return null
  } catch {
    return null
  }
}

/**
 * The locked state a gated coach surface renders instead of the coach's read:
 * a CLOSED LEDGER PAGE (G4). The entry is visibly written — ruled lines, blurred
 * out — and sealed under the ◆ wax, with one shame-free way in and the promise
 * that the book itself never locks. Not a thin notice; a page worth opening.
 */
export function CoachGate({ line = 'The coach’s read is written on this page.' }) {
  return (
    <div className="relative overflow-hidden border border-line bg-surface2">
      {/* the page beneath the seal — written, but blurred behind the wax */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-3 px-6 opacity-50 blur-[2.5px]"
      >
        {[92, 74, 84, 62].map((w, i) => (
          <span key={i} className="block h-px bg-line" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="relative flex flex-col items-center px-4 py-5 text-center">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-full border border-accent text-[0.75rem] text-accent"
        >
          ◆
        </span>
        <span className="mt-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">Coach · sealed</span>
        <p className="mt-1.5 max-w-[15rem] font-serif text-[0.875rem] italic leading-relaxed text-muted">{line}</p>
        <button
          type="button"
          onClick={openPaywall}
          className="mt-3 rounded-control bg-accent px-4 py-2.5 font-clock text-[0.6875rem] font-semibold uppercase tracking-widest2 text-accent-ink"
        >
          Open the coach’s page · {TRIAL_DAYS}-day free
        </button>
        <span className="mt-2 font-clock text-[0.6875rem] uppercase tracking-wide text-faint">
          Your book stays free. Always.
        </span>
      </div>
    </div>
  )
}

export default function Paywall({ onClose }) {
  const { entitled, entitlement } = useEntitlement()
  const [plan, setPlan] = useState('yearly')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  // Storefront-localized plan display (a Berlin phone shows €). Starts on the
  // hardcoded USD reference and swaps in Apple's strings when native answers.
  const [plans, setPlans] = useState(PLANS)
  const lapsed = hasLapsed(entitlement)
  const sel = plans.find((p) => p.key === plan) || plans[0]
  const personal = personalLine()
  const closeRef = useRef(null)

  // Dialog manners: focus on Close at open, Escape closes only the top dialog
  // (the fine print stacks over this paywall). See useModalDismiss.
  useModalDismiss(onClose, closeRef)

  useEffect(() => {
    track(lapsed ? 'paywall_view_lapsed' : 'paywall_view')
    let alive = true
    getLocalizedPlans().then((p) => {
      if (alive && Array.isArray(p) && p.length) setPlans(p)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function buy() {
    setBusy(true)
    setNote(null)
    const res = await purchase(plan)
    setBusy(false)
    if (res.ok) {
      // Count what actually happened (P1): a fresh trial is 'trial_start'; a
      // winback/immediate-charge purchase writes status 'active' and is the
      // 'subscribe' the funnel exists to measure — labeling both trial_start
      // made the one business question (does the paywall convert to PAID)
      // unanswerable.
      track(getEntitlement().status === 'active' ? 'subscribe' : 'trial_start')
      // Leave the sheet on its confirmation state; the gates unlock live.
    } else if (res.reason === 'ios-only') {
      setNote('Subscriptions run through the App Store — hire the coach in the iOS app.')
    } else {
      setNote('The register didn’t open. Nothing was charged — try again.')
    }
  }

  async function doRestore() {
    setBusy(true)
    setNote(null)
    const res = await restore()
    setBusy(false)
    if (!res.ok) {
      // 'verify-failed' is a TRANSIENT StoreKit/network miss, not a verdict —
      // telling a paying subscriber "no prior purchase found" on a hiccup was
      // a lie that read as revocation (P1 copy honesty).
      setNote(
        res.reason === 'ios-only'
          ? 'Restore runs through the App Store — open the iOS app.'
          : res.reason === 'verify-failed'
            ? 'The App Store didn’t answer — your subscription is untouched. Try again in a moment.'
            : 'No prior purchase found for this Apple account.'
      )
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={entitled ? 'The coach is hired' : lapsed ? 'Re-hire the coach' : 'Hire the coach'}
      className="fixed inset-0 z-50 overflow-y-auto bg-bg text-ink pt-safe"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-app flex-col px-5 pb-8">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted pt-safe"
        >
          ✕
        </button>

        {entitled ? (
          // ── Hired ────────────────────────────────────────────────────────────
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="font-clock text-[0.75rem] uppercase tracking-[0.25em] text-accent">
              The coach is hired
            </div>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {entitlement.source === 'dev-mock'
                ? 'Dev register — a mock trial is active so every gate can be walked.'
                : 'Your trial is running. The Guardian’s watch, the weekly review, and the margin notes are open.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 w-full max-w-xs rounded-md bg-ink py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-bg"
            >
              Back to the book
            </button>
          </div>
        ) : (
          // ── The contract page ────────────────────────────────────────────────
          <>
            <div className="pt-10">
              <div className="border-b border-line pb-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
                The coach
              </div>
              {lapsed ? (
                <>
                  <h1 className="mt-4 text-[1.625rem] font-semibold leading-tight">
                    The contract lapsed.
                    <br />
                    The book never closed.
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Everything you wrote is still yours — nothing was lost. Re-hire the coach and
                    the reading picks up where the tape is now:
                  </p>
                </>
              ) : (
                <>
                  <h1 className="mt-4 text-[1.625rem] font-semibold leading-tight">
                    Your book is yours.
                    <br />
                    The coach is hired.
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    The book — your schedule, streaks, sprints, and the night page — is free forever.
                    The coach reads it and writes back:
                  </p>
                  {/* Read back from the user's OWN onboarding answers (G4). */}
                  {personal && (
                    <p className="mt-2 border-l-2 border-accent-deep pl-3 text-[0.8125rem] leading-relaxed text-ink">
                      {personal}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Structural free-vs-coach split (G4): the FREE book on the left, the
                paid READS on the right — so a free feature can't be dressed up as
                paid. Two columns make the boundary literal. */}
            <div className="mt-5 grid grid-cols-2 border-t border-line">
              <div className="border-r border-line py-4 pr-3">
                <div className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
                  The book · free
                </div>
                <ul className="mt-2.5 space-y-2 text-[0.75rem] leading-snug text-muted">
                  {['Schedule & heat sheet', 'Streaks, sprints, the record', 'The night page & 988', 'Export — your data, always'].map(
                    (x) => (
                      <li key={x} className="flex gap-1.5">
                        <span aria-hidden className="text-faint">
                          —
                        </span>
                        <span>{x}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div className="py-4 pl-3">
                <div className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-accent">
                  The coach · {TRIAL_DAYS}-day free
                </div>
                <ul className="mt-2.5 space-y-2">
                  {[
                    ['The margin note', 'a daily read of your tape'],
                    ['The Guardian’s reasoning', 'why the drift is rising'],
                    ['The Sunday review', 'the week reconciled'],
                    ['The adaptive protocol', 'urge steps re-dealt'],
                  ].map(([t, s]) => (
                    <li key={t} className="text-[0.75rem] leading-snug">
                      <span className="text-ink">{t}</span>
                      <span className="block text-[0.6875rem] text-muted">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Plans — annual is the pushed default (M0.2) */}
            <div className="mt-6 space-y-2.5">
              {plans.map((p) => {
                const on = plan === p.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlan(p.key)}
                    aria-pressed={on}
                    className={`flex w-full items-baseline justify-between gap-3 rounded-md border p-4 text-left ${
                      on ? 'border-accent-deep bg-surface2' : 'border-line bg-surface'
                    }`}
                  >
                    <span>
                      <span className={`block text-[0.9375rem] ${on ? 'font-medium' : ''} text-ink`}>
                        {p.line}
                      </span>
                      <span className="block text-[0.75rem] text-muted">{p.sub}</span>
                    </span>
                    <span className="font-clock tnum text-[1.0625rem] text-ink">
                      {p.price}
                      <span className="text-[0.6875rem] text-muted"> / {p.per}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex-1" />

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={buy}
                disabled={busy}
                className="w-full rounded-md bg-accent py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-accent-ink disabled:opacity-50"
              >
                {busy ? 'Opening the register…' : lapsed ? 'Re-hire the coach' : `Start ${TRIAL_DAYS} days free`}
              </button>
              {note && <p className="text-center text-xs leading-relaxed text-muted">{note}</p>}
              {/* App Review 3.1.2: state auto-renewal, price+period, and the cancel
                  window adjacent to the buy button, with Terms + Privacy links. */}
              <p className="text-center text-[0.6875rem] leading-relaxed text-muted">
                {lapsed
                  ? `Billed through Apple. If your free week was used, ${sel.price}/${sel.per} is charged now. Auto-renews at ${sel.price}/${sel.per} unless turned off at least 24 hours before the period ends — cancel anytime in Settings → Subscriptions.`
                  : `Free for ${TRIAL_DAYS} days, then auto-renews at ${sel.price}/${sel.per} unless turned off at least 24 hours before the trial ends. Billed through Apple — cancel anytime in Settings → Subscriptions.`}
              </p>
              {/* Their own row of 44px-tall targets — Restore is one Apple checks,
                  and the policy links are legally required, so they can't be
                  fine-print taps (a11y: min-h-[44px]). */}
              <div className="flex flex-wrap items-center justify-center text-[0.75rem] text-muted">
                <button
                  type="button"
                  onClick={doRestore}
                  className="inline-flex min-h-[44px] items-center px-2 underline underline-offset-2"
                >
                  Restore purchases
                </button>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => openLegal('privacy')}
                  className="inline-flex min-h-[44px] items-center px-2 underline underline-offset-2"
                >
                  Privacy policy
                </button>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => openLegal('terms')}
                  className="inline-flex min-h-[44px] items-center px-2 underline underline-offset-2"
                >
                  Terms of use
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
