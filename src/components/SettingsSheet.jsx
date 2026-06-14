// SettingsSheet.jsx — full Phase 2 settings.
// Name · wake/bed times · money goal · report date · accountability partners
// (multiple — they power the HELP button) · shoes · reading · Focus shortcut ·
// export JSON · wipe all (double-confirmed).

import { useRef, useState } from 'react'
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

export default function SettingsSheet({ onClose, onOpenReview }) {
  const {
    settings,
    updateSettings,
    addPartner,
    removePartner,
    addShoe,
    removeShoe,
    addReadingSection,
    exportData,
    importData,
    wipeData,
  } = useStore()

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Row label="Your name">
        <input value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="First name" className="input" />
      </Row>

      <div className="flex gap-3">
        <Row label="Wake time">
          <input type="time" value={settings.wakeTime} onChange={(e) => updateSettings({ wakeTime: e.target.value })} className="input font-clock" />
        </Row>
        <Row label="Phone out by">
          <input type="time" value={settings.bedTime} onChange={(e) => updateSettings({ bedTime: e.target.value })} className="input font-clock" />
        </Row>
      </div>
      <p className="-mt-1 px-1 text-[11px] leading-relaxed text-muted">
        Lock the wake time; let bedtime float to meet it. Up by ~7:00 still counts — forgiving clock,
        firm cue. Phone out = bed is for sleep only (and a recovery guardrail). Banked sleep runs
        faster — college sprinters ~0.7s (Mah 2011).
      </p>

      <div className="flex gap-3">
        <Row label="Monthly goal">
          <div className="flex items-center input">
            <span className="font-clock text-muted">$</span>
            <input type="number" value={settings.moneyGoal} onChange={(e) => updateSettings({ moneyGoal: Number(e.target.value) || 0 })} className="w-full bg-transparent pl-1 font-clock text-ink focus:outline-none" />
          </div>
        </Row>
        <Row label="Report to college">
          <input type="date" value={settings.reportDate} onChange={(e) => updateSettings({ reportDate: e.target.value })} className="input font-clock text-sm" />
        </Row>
      </div>

      {/* Accountability partners — the HELP button */}
      <Section title="Accountability partners" hint="Everyone here shows up on the HELP NOW protocol for a one-tap text.">
        {(settings.partners || []).length > 0 && (
          <ul className="mb-3 space-y-2">
            {settings.partners.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
                <div className="flex-1">
                  <div className="text-sm text-ink">{p.name}</div>
                  <div className="font-clock text-xs text-muted">{p.phone || 'no number'}</div>
                </div>
                <button type="button" onClick={() => removePartner(p.id)} aria-label="Remove" className="text-muted hover:text-ink">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddPartner onAdd={addPartner} />
      </Section>

      {/* Shoes */}
      <Section title="Shoes" hint="Tag runs with a shoe on the Train tab to track mileage.">
        {(settings.shoes || []).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {settings.shoes.map((s) => (
              <span key={s} className="flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-1 text-sm text-ink">
                {s}
                <button type="button" onClick={() => removeShoe(s)} aria-label="Remove shoe" className="text-muted">×</button>
              </span>
            ))}
          </div>
        )}
        <AddText placeholder="Add a shoe…" onAdd={addShoe} />
      </Section>

      {/* Reading */}
      <Section title="Reading plan" hint="Add the next book/section to your reading queue.">
        <AddText placeholder="e.g. Proverbs 1" onAdd={addReadingSection} />
      </Section>

      <Row label="iOS Focus shortcut name">
        <input value={settings.focusShortcutName} onChange={(e) => updateSettings({ focusShortcutName: e.target.value })} placeholder="Sprint" className="input" />
      </Row>

      <div className="space-y-2 border-t border-line pt-4">
        <button type="button" onClick={onOpenReview} className="w-full rounded-2xl border border-accent py-3 text-sm font-medium text-accent">
          Open weekly review (Sunday Debrief)
        </button>
        <button type="button" onClick={() => downloadJSON(exportData())} className="w-full rounded-2xl border border-line bg-surface2 py-3 text-sm text-ink">
          Export all data (JSON backup)
        </button>
        <ImportButton onImport={importData} />
        <WipeButton onWipe={wipeData} />
      </div>

      <button type="button" onClick={onClose} className="w-full py-2 text-sm text-muted">Done</button>
    </Sheet>
  )
}

function Row({ label, children }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

function Section({ title, hint, children }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-accent">{title}</div>
      {hint && <p className="mt-1 mb-3 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  )
}

function AddPartner({ onAdd }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input flex-1" />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555…" className="input flex-1 font-clock" />
      </div>
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => { onAdd(name, phone); setName(''); setPhone('') }}
        className="w-full rounded-xl bg-accent py-2 text-sm font-medium text-accent-ink disabled:opacity-40"
      >
        Add partner
      </button>
    </div>
  )
}

function AddText({ placeholder, onAdd }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-2">
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="input flex-1" />
      <button
        type="button"
        disabled={!val.trim()}
        onClick={() => { onAdd(val); setVal('') }}
        className="rounded-xl border border-line bg-surface2 px-4 text-sm text-ink disabled:opacity-40"
      >
        Add
      </button>
    </div>
  )
}

// Two-tap erase, so a stray tap can't wipe everything.
function WipeButton({ onWipe }) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="w-full py-2 text-xs text-muted">
        Wipe all data
      </button>
    )
  }
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => setArmed(false)} className="flex-1 rounded-xl border border-line py-2 text-xs text-muted">
        Cancel
      </button>
      <button type="button" onClick={onWipe} className="flex-1 rounded-xl border border-muted py-2 text-xs text-ink">
        Tap again — erase everything
      </button>
    </div>
  )
}
