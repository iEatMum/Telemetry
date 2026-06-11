// SettingsSheet.jsx — the MINIMAL Phase-1 settings. Just the fields the Phase-1
// features actually use (greeting name, wake time, accountability partner, the
// Focus shortcut name) plus a JSON backup so data is never trapped.
// Money goal, report-to-college date, and wipe-all arrive with full Settings in Phase 2.

import Sheet from './Sheet.jsx'
import { useStore } from '../lib/store.jsx'
import { dateKey } from '../lib/dates.js'

function downloadJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `locked-in-backup-${dateKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function SettingsSheet({ onClose }) {
  const { settings, updateSettings, exportData } = useStore()

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Row label="Your name">
        <input
          value={settings.name}
          onChange={(e) => updateSettings({ name: e.target.value })}
          placeholder="First name"
          className="input"
        />
      </Row>

      <Row label="Wake time">
        <input
          type="time"
          value={settings.wakeTime}
          onChange={(e) => updateSettings({ wakeTime: e.target.value })}
          className="input font-clock"
        />
      </Row>

      <div className="rounded-2xl border border-line p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-accent">
          Accountability partner
        </div>
        <p className="mt-1 text-xs text-muted">
          Used by the one-tap text in the urge protocol. Stays on your device.
        </p>
        <div className="mt-3 space-y-3">
          <Row label="Name">
            <input
              value={settings.partnerName}
              onChange={(e) => updateSettings({ partnerName: e.target.value })}
              placeholder="Who's in your corner?"
              className="input"
            />
          </Row>
          <Row label="Phone">
            <input
              type="tel"
              inputMode="tel"
              value={settings.partnerPhone}
              onChange={(e) => updateSettings({ partnerPhone: e.target.value })}
              placeholder="+1 555 123 4567"
              className="input font-clock"
            />
          </Row>
        </div>
      </div>

      <Row label="iOS Focus shortcut name">
        <input
          value={settings.focusShortcutName}
          onChange={(e) => updateSettings({ focusShortcutName: e.target.value })}
          placeholder="Sprint"
          className="input"
        />
      </Row>

      <div className="border-t border-line pt-4">
        <button
          type="button"
          onClick={() => downloadJSON(exportData())}
          className="w-full rounded-2xl border border-line bg-surface2 py-3 text-sm text-ink"
        >
          Export all data (JSON backup)
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Money goal, report-to-college date, and wipe-all land with full
          Settings in Phase 2.
        </p>
      </div>

      <button type="button" onClick={onClose} className="w-full py-2 text-sm text-muted">
        Done
      </button>
    </Sheet>
  )
}

function Row({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}
