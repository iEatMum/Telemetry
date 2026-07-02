// RecordLedger.jsx — the Witnessed Ledger, as an embeddable section.
//
// Extracted from the old Record screen so it can live inside the Evening Examen
// ("face the truth"). Same machine-truth treatment: the one place with NO gold —
// monospace, hairline-ruled, the marginal rule's ink encodes the verdict, zero
// edit affordance. These are the Referee's sealed verdicts; you can't edit them,
// and neither can the app.

import { LedgerNotice } from './ui.jsx'
import { WEEKDAYS, MONTHS } from '../lib/dates.js'

const KIND_LABELS = { wake: 'wake', bedtime: 'phone down' }
const BAR_OPACITY = { hit: 'opacity-20', late: 'opacity-50', missed: 'opacity-100' }
const VERDICT_INK = { hit: 'text-muted', late: 'text-muted', missed: 'text-ink' }

function eventISO(row) {
  return row.at || row.created_at || null
}
function shortTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}
function groupByDay(rows) {
  const groups = []
  let current = null
  for (const row of rows) {
    const iso = eventISO(row)
    const d = iso ? new Date(iso) : null
    const key = d && !isNaN(d) ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : 'unknown'
    if (!current || current.key !== key) {
      current = { key, date: d && !isNaN(d) ? d : null, rows: [] }
      groups.push(current)
    }
    current.rows.push(row)
  }
  return groups
}
function dayLabel(date) {
  if (!date) return 'undated'
  return `${WEEKDAYS[date.getDay()].slice(0, 3)} · ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`
}

// Purely presentational — the Examen owns the useRecord() fetch and passes the
// rows down (so the witnessed data is fetched once and shared with Counsel).
export default function RecordLedger({ rows = [], status = 'loading', fetchedAt = null }) {
  const groups = groupByDay(rows)
  const hasRows = rows.length > 0

  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <h2 className="font-clock text-[13px] uppercase tracking-[0.18em] text-muted">The Record</h2>
        <p className="max-w-[34ch] text-[13px] leading-relaxed text-muted">
          Witnessed by the Referee. You can&rsquo;t edit this — neither can the app.
          It&rsquo;s the mirror.
        </p>
      </div>

      {status === 'local' ? (
        <LedgerNotice>The Record fills once sync is on and your wake / phone-down Shortcuts report in.</LedgerNotice>
      ) : !hasRows && status === 'loading' ? (
        <LedgerNotice>Reading the ledger&hellip;</LedgerNotice>
      ) : !hasRows && status === 'error' ? (
        <LedgerNotice>Couldn&rsquo;t reach the Record. It&rsquo;ll be here, unchanged, when you&rsquo;re back online.</LedgerNotice>
      ) : !hasRows ? (
        <LedgerNotice>Nothing witnessed yet. When your automations report, the verdict is sealed here.</LedgerNotice>
      ) : (
        <>
          <div>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex items-center gap-3 pb-1 pt-4">
                  <span className="font-clock text-[11px] uppercase tracking-wider text-muted">{dayLabel(g.date)}</span>
                  <span className="h-px flex-1 bg-line" aria-hidden />
                </div>
                <ul>
                  {g.rows.map((row) => (
                    <Entry key={row.id} row={row} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Footer status={status} fetchedAt={fetchedAt} />
        </>
      )}
    </section>
  )
}

function Entry({ row }) {
  const verdict = row.verdict || 'missed'
  const kind = KIND_LABELS[row.kind] || row.kind || '—'
  return (
    <li className="flex items-stretch">
      <span className={`mr-3 w-px shrink-0 bg-ink ${BAR_OPACITY[verdict] || 'opacity-100'}`} aria-hidden />
      <div className="flex flex-1 items-baseline gap-3 py-2 font-clock text-[13px] leading-none">
        <span className="w-[5.5rem] shrink-0 truncate text-ink">{kind}</span>
        <span className="flex-1 tnum text-muted">
          {row.target || '—'} <span className="opacity-40">&rarr;</span> {row.actual || '—'}
        </span>
        <span className={`w-14 text-right tabular-nums ${VERDICT_INK[verdict] || 'text-ink'}`}>{verdict}</span>
      </div>
      <span className="sr-only">at {shortTime(eventISO(row))}</span>
    </li>
  )
}

// LedgerNotice is imported from ui.jsx

function Footer({ status, fetchedAt }) {
  return (
    <div className="space-y-2 pt-3">
      <div className="h-px bg-line" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-clock text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><Mark className="opacity-20" /> hit</span>
        <span className="flex items-center gap-1.5"><Mark className="opacity-50" /> late</span>
        <span className="flex items-center gap-1.5"><Mark className="opacity-100" /> missed</span>
        <span className="ml-auto">
          {status === 'error' ? 'offline · last sealed copy' : fetchedAt ? `as of ${shortTime(fetchedAt)}` : ''}
        </span>
      </div>
    </div>
  )
}
function Mark({ className = '' }) {
  return <span className={`inline-block h-3 w-px bg-ink ${className}`} aria-hidden />
}
