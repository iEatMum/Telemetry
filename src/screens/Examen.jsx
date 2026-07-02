// Examen.jsx — the Evening Face. The end of the day, in one still place.
//
// Three movements, top to bottom, the way the day closes:
//   1. The Record   — face the truth (the Referee's witnessed verdicts)
//   2. Handover     — hand it over (the Surrender ritual)
//   3. Consider     — receive guidance (Counsel's read of the drift + what you
//                     surrendered, with one resource for the next 24 hours)
//
// The witnessed checkpoints are fetched once here and shared with both the
// ledger and Counsel.

import { useRecord } from '../lib/record.js'
import RecordLedger from '../components/RecordLedger.jsx'
import HandoverComposer from '../components/HandoverComposer.jsx'
import Counsel from '../components/Counsel.jsx'
import { greeting } from '../lib/dates.js'

export default function Examen() {
  const { rows, status, fetchedAt } = useRecord()

  return (
    <div className="space-y-8 pb-24 pt-3">
      <header className="space-y-1">
        <div className="font-clock text-[11px] uppercase tracking-[0.2em] text-muted">{greeting()}</div>
        <h1 className="font-clock text-2xl font-semibold tracking-tight">Examen</h1>
        <p className="max-w-[40ch] text-[14px] leading-relaxed text-muted">
          Face the day, hand it over, and take one thing into tomorrow.
        </p>
      </header>

      <RecordLedger rows={rows} status={status} fetchedAt={fetchedAt} />
      <HandoverComposer />
      <Counsel checkpoints={rows} />
    </div>
  )
}
