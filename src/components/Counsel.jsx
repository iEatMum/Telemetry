// Counsel.jsx — the "Consider" stream. One cohesive list of the Guardian's
// guidance: the pattern-detected Counsel card (from the witnessed checkpoints)
// on top, then the Considerations you surrendered. Both speak in the same
// machine-truth "Consider" voice — guidance, never a scoreboard.
//
// The Counsel card is built locally (counsel.js, rule-based) for now; the real
// content-aware synthesis is the server-side AI step. Either way it never echoes
// raw user text and danger patterns route to the partner.

import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { ConsiderCard } from './ui.jsx'
import { counselFor, strongestPattern } from '../lib/counsel.js'
import { invokeCounsel } from '../lib/counselClient.js'
import { appDayKey } from '../lib/dates.js'

export default function Counsel({ checkpoints = [] }) {
  const { handover, dismissConsideration, dismissCounsel, settings } = useStore()
  const partnerName = (settings.partners || [])[0]?.name || ''

  // The local, rule-based card shows instantly (and is the offline fallback).
  const local = counselFor(checkpoints, { partnerName })
  const pattern = strongestPattern(checkpoints)

  // When online + configured, ask the server-side Guardian to synthesize a richer
  // card from the same pattern; it swaps in when it returns. Re-runs when the
  // detected drift changes. No raw user text is ever sent — only the pattern.
  const [ai, setAi] = useState(null)
  useEffect(() => {
    let active = true
    setAi(null)
    if (!pattern) return
    invokeCounsel(pattern, { partnerName }).then((card) => {
      if (active && card) setAi(card)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern?.key, pattern?.count, partnerName])

  const raw = ai || local
  const acked = raw && (handover.counselAck || []).some((a) => a.key === raw.pattern && a.day === appDayKey())
  const counsel = acked ? null : raw

  const considerations = handover.considerations.filter((c) => !c.dismissed)
  const nothing = !counsel && considerations.length === 0

  return (
    <section className="space-y-3">
      <h2 className="font-clock text-[13px] uppercase tracking-[0.18em] text-muted">Consider</h2>

      {nothing ? (
        <div className="border-l border-line pl-4 text-[13px] leading-relaxed text-muted">
          Nothing to weigh tonight. When the record drifts, or you hand something
          over, the Guardian raises it here.
        </div>
      ) : (
        <div className="space-y-2">
          {counsel && <ConsiderCard c={counsel} onDismiss={() => dismissCounsel(counsel.pattern)} />}
          {considerations.map((c) => (
            <ConsiderCard key={c.id} c={c} onDismiss={() => dismissConsideration(c.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

// ConsiderCard is imported from ui.jsx
