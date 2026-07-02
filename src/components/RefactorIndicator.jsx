// RefactorIndicator.jsx — the "Sync & Refactor" status control.
//
// The visible end of the Performance Loop. While the day is open it invites the
// user to FINISH THE DAY; doing so closes the day in engagement.js, which seals
// any pending high-impact items as missed, builds the Performance Payload, and
// flags the layout for a refactor. Once queued it shows that tomorrow's deck
// will rebuild.
//
// No backend this phase: closeDay() stashes the payload in localStorage and we
// log it; nothing is sent. When the Architect function lands (P3.4 server side)
// this is where the POST + re-pull will hook in.

import { useState } from 'react'
import { useRefactorState, closeDay } from '../lib/engagement.js'
import { requestRefactor } from '../lib/architectClient.js'
import { triggerStakesCheck } from '../lib/stakes.js'

export default function RefactorIndicator({ className = '' }) {
  const { pending } = useRefactorState()
  const [syncing, setSyncing] = useState(false)

  function finishDay() {
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
    // A brief "syncing" pulse so the action feels real (no network to await).
    setTimeout(() => setSyncing(false), 900)
  }

  const label = syncing
    ? '◢ Finishing day…'
    : pending
      ? '✓ Refactor queued · deck rebuilds tomorrow'
      : '◢ Finish day · Sync & Refactor'

  const tone = pending ? 'border-accent text-accent' : 'border-line text-ink'

  return (
    <button
      type="button"
      onClick={finishDay}
      disabled={pending || syncing}
      className={`flex items-center justify-center gap-2 rounded-md border bg-surface/95 px-4 py-3 font-clock text-xs font-semibold uppercase tracking-widest2 backdrop-blur ${tone} ${
        syncing ? 'animate-pulse-accent' : ''
      } ${className}`}
    >
      {label}
    </button>
  )
}
