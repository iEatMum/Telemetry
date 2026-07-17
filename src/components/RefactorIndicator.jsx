// RefactorIndicator.jsx — the "Sync & Refactor" seal (the Examen's evening act).
//
// The visible end of the Performance Loop. While the day is open it invites the
// user to FINISH THE DAY; the tap opens a ConfirmSheet framed by the tone
// engine's step.commit line, and a 1.2s HOLD attests (friction inversion — the
// ceremonial path is charged, never a stray tap). Sealing closes the day in
// engagement.js (pending high-impact items seal as missed), builds the
// Performance Payload, queues the Architect refactor + the stakes check, and
// answers with one quiet toast. One seal per day: reopening shows the queued
// state, never a second ask.

import { useState } from 'react'
import { useRefactorState, closeDay } from '../lib/engagement.js'
import { requestRefactor } from '../lib/architectClient.js'
import { triggerStakesCheck } from '../lib/stakes.js'
import { useStore } from '../lib/store.jsx'
import { voice } from '../lib/toneEngine.js'
import { streakDays } from '../lib/dates.js'
import { showToast } from '../lib/toast.js'
import ConfirmSheet from './ConfirmSheet.jsx'

export default function RefactorIndicator({ className = '' }) {
  const { pending } = useRefactorState()
  const { settings, streak } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function seal() {
    setConfirming(false)
    if (pending || syncing) return
    setSyncing(true)
    const payload = closeDay()
    // The exact object the Architect will consume — inspect it in the console.
    console.log('[performance payload → architect]', payload)
    // Fire-and-forget: ask the Architect to refactor tomorrow's deck. Fails soft
    // (no-op) with no backend/session — the local deck stays in charge until the
    // function is deployed. The new layout is picked up on next open via useLayout.
    requestRefactor(payload).then((r) => {
      if (r.ok) console.log('[architect] refactor queued · profile v' + r.profileVersion)
    })
    // End-of-day stakes check: if high-impact blocks were missed, the server
    // `stakes` function fires the configured consequence (SMS / record penalty).
    // Fail-soft + no-op without a session — no secrets ever touch the client.
    triggerStakesCheck(payload).then((r) => {
      if (r.ok) console.log('[stakes] consequence:', r.status, '·', r.penaltyLevel)
    })
    // A brief settle, then the acknowledgment moment — in ledger voice, not
    // engineer-speak (G7): "rule off the day", not "sync & refactor".
    setTimeout(() => {
      setSyncing(false)
      showToast('Tomorrow’s page is set.')
    }, 900)
  }

  const label = syncing
    ? 'Ruling off the day…'
    : pending
      ? 'Day ruled off'
      : 'Rule off the day'

  // Queued = accent text + accent-deep border + inset glow (handoff SyncBar).
  const tone = pending
    ? 'border-accent-deep text-accent shadow-glow-inset'
    : 'border-line text-ink'

  const profile = { streakModel: settings.streakModel, theme: settings.theme }
  const params = {
    days: streakDays(streak.startedAt),
    wins: (streak.urgesSurvived || []).length,
    winsNext: (streak.urgesSurvived || []).length + 1,
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending || syncing}
        className={`flex w-full items-center justify-center gap-2 rounded-md border bg-surface/95 px-4 py-3 font-clock text-xs font-semibold uppercase tracking-widest2 backdrop-blur ${tone} ${
          syncing ? 'animate-pulse-accent' : ''
        } ${className}`}
      >
        <span className="text-accent" aria-hidden>
          {pending ? '✓' : '◢'}
        </span>
        {label}
      </button>
      {confirming && (
        <ConfirmSheet
          title="Seal the day"
          body={voice(profile, 'step.commit', params) || 'The ledger closes; the forge rebuilds tomorrow.'}
          holdLabel="Hold to seal"
          onSeal={seal}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}
