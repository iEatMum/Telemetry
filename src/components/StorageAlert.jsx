// StorageAlert.jsx — the honesty strip for storage failures (MASTERPLAN P1).
//
// The store raises 'telemetry:storage-alert' when a write is refused (quota /
// private mode) or a page is quarantined (unparseable slice). This banner is the
// user-facing half: one calm line under the status strip, dismissible, never
// modal — a warning must not block the book it's warning about. Alerts raised
// before this mounts are picked up from storageAlerts() (the session log).

import { useEffect, useState } from 'react'
import { storageAlerts } from '../lib/storage.js'

const COPY = {
  'write-failed':
    'The book couldn’t take that ink — this phone’s storage is full. Free some space and try again; what was already written is safe.',
  corrupt: 'A damaged page was set aside so the rest of the book could open. Your record continues from here.',
}

export default function StorageAlert() {
  const [alert, setAlert] = useState(() => storageAlerts().slice(-1)[0] || null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onAlert = (e) => {
      setAlert(e.detail)
      setDismissed(false)
    }
    window.addEventListener('telemetry:storage-alert', onAlert)
    return () => window.removeEventListener('telemetry:storage-alert', onAlert)
  }, [])

  if (!alert || dismissed) return null
  return (
    <div role="alert" className="mx-auto w-full max-w-app px-4 pt-3">
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface2 px-4 py-3">
        <p className="m-0 flex-1 text-[0.8125rem] leading-relaxed text-ink">{COPY[alert.kind] || COPY.corrupt}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss storage warning"
          className="min-h-[44px] shrink-0 px-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted"
        >
          Noted
        </button>
      </div>
    </div>
  )
}
