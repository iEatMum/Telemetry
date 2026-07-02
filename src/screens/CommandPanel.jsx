// CommandPanel.jsx — the configuration hub surface.
//
// Identity (who the deck is calibrated for), system diagnostics (connection,
// sync freshness), and the doors into the heavier tools: the full Settings
// sheet (which owns editing, export, wipe) and the Weekly Review. This surface
// replaces the old floating top-right gear — settings access now lives on the
// nav, out of the status bar's collision zone entirely.

import { useStore } from '../lib/store.jsx'
import { status as syncStatus } from '../lib/sync.js'
import { Card, SectionLabel } from '../components/ui.jsx'

const MODEL_LABEL = {
  avoidance: 'Never break it · chain defense',
  accumulation: 'Stack wins · totals only climb',
  engagement: 'Just show up · daily contact',
}

function DiagRow({ label, value, tone = 'text-ink' }) {
  return (
    <div className="flex items-baseline justify-between px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-widest2 text-muted">{label}</span>
      <span className={`font-clock text-xs ${tone}`}>{value}</span>
    </div>
  )
}

export default function CommandPanel({ conn, onOpenSettings, onOpenReview }) {
  const { settings } = useStore()
  const sync = syncStatus()

  return (
    <div className="space-y-5">
      {/* Identity — what the engines are calibrated to */}
      <div>
        <SectionLabel className="mb-2 px-1">Operator</SectionLabel>
        <Card>
          <DiagRow label="Name" value={settings.name || '—'} />
          <div className="border-t border-line/50" />
          <DiagRow label="Engine type" value={MODEL_LABEL[settings.streakModel] || 'not set — run the survey'} />
          <div className="border-t border-line/50" />
          <DiagRow label="Theme" value={settings.theme || 'terminal'} />
          <div className="border-t border-line/50" />
          <DiagRow label="Wake anchor" value={settings.wakeTime} />
        </Card>
      </div>

      {/* System sync health */}
      <div>
        <SectionLabel className="mb-2 px-1">System</SectionLabel>
        <Card>
          <DiagRow
            label="Link"
            value={conn.label}
            tone={conn.tone === 'accent' ? 'text-accent' : conn.tone === 'warn' ? 'text-warn' : 'text-muted'}
          />
          <div className="border-t border-line/50" />
          <DiagRow label="Backend" value={sync.configured ? (sync.signedIn ? 'signed in' : 'signed out') : 'local-only'} />
          <div className="border-t border-line/50" />
          <DiagRow
            label="Last pull"
            value={sync.pulledAt ? new Date(sync.pulledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'never'}
          />
        </Card>
      </div>

      {/* The heavy tools live in their sheets */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full rounded-md border border-line bg-surface px-4 py-3.5 text-left text-[15px] text-ink"
        >
          Settings — profile, partners, themes, data
        </button>
        <button
          type="button"
          onClick={onOpenReview}
          className="w-full rounded-md border border-line bg-surface px-4 py-3.5 text-left text-[15px] text-ink"
        >
          Weekly review
        </button>
      </div>
    </div>
  )
}
