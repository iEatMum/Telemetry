// SettingsSheet.jsx — settings for the shipping v1.
// Name · wake/bed times · interface · opt-in modules · accountability partners
// (multiple — they power the HELP button and the night page's one-tap text) ·
// reading plan (feeds the faith card) · Focus shortcut · the fine print ·
// export/import JSON · wipe all (double-confirmed).

import { useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import { useStore } from '../lib/store.jsx'
import { useTheme } from '../lib/theme.jsx'
import { dateKey } from '../lib/dates.js'
import { openLegal } from './LegalSheet.jsx'
import { useEntitlement } from '../lib/purchases.js'
import { selectionTick } from '../lib/haptics.js'

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
      <p className="-mt-1 px-1 text-[0.6875rem] leading-relaxed text-muted">
        Lock the wake time; let bedtime float to meet it. Up by ~7:00 still counts — forgiving clock,
        firm cue. Phone out = bed is for sleep only (and a recovery guardrail). Banked sleep runs
        faster — college sprinters ~0.7s (Mah 2011).
      </p>

      {/* The dictated day — same list onboarding seeds and the deck's
          "Dictate the day" line edits (App.jsx owns the sheet; the event
          mounts it above this one). */}
      <Section title="Your day, dictated" hint="The blocks the Today page prints. Yours to write — the app never invents them.">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('telemetry:open-dayplan'))}
          className="w-full rounded-lg border border-line bg-surface2 py-2.5 text-sm text-ink"
        >
          Edit the day's blocks{(settings.dayBlocks || []).length ? ` (${settings.dayBlocks.length})` : ''}
        </button>
      </Section>

      <ThemePicker />

      <ModulesSection settings={settings} updateSettings={updateSettings} />

      <AiConsentSection />

      {/* Accountability partners — the HELP button */}
      <Section title="Accountability partners" hint="Everyone here shows up on the HELP NOW protocol for a one-tap text.">
        {(settings.partners || []).length > 0 && (
          <ul className="mb-3 space-y-2">
            {settings.partners.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg bg-surface2 px-3 py-2">
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

      {/* Reading */}
      <Section title="Reading plan" hint="Queue the next book or section — the faith card walks it.">
        <AddText placeholder="e.g. Proverbs 1" onAdd={addReadingSection} />
      </Section>

      <Row label="iOS Focus shortcut name">
        <input value={settings.focusShortcutName} onChange={(e) => updateSettings({ focusShortcutName: e.target.value })} placeholder="Sprint" className="input" />
      </Row>

      {/* The coach's standing (P1): once entitled every CoachGate disappears,
          which used to make the paywall — and with it Restore and any status
          read — unreachable for the people PAYING. This row is the subscriber's
          one honest surface: current status + Apple's own manage page (cancel
          guidance must survive past the point of purchase). */}
      <CoachSection />

      {/* Lock-screen privacy (P3b): generic reminder text. Defaults ON with the
          recovery module — a visible lock screen must never tell a story. */}
      <Section title="Private reminders" hint="Lock-screen text stays generic — no block names, no Guardian language.">
        <button
          type="button"
          role="switch"
          aria-checked={settings.notifPrivacy ?? !!settings.modules?.recovery}
          onClick={() => updateSettings({ notifPrivacy: !(settings.notifPrivacy ?? !!settings.modules?.recovery) })}
          className={
            'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-quick ' +
            ((settings.notifPrivacy ?? !!settings.modules?.recovery) ? 'border-accent-deep bg-pos-soft' : 'border-line bg-surface2')
          }
        >
          <span className="flex-1 text-sm text-ink">
            {(settings.notifPrivacy ?? !!settings.modules?.recovery)
              ? '“Telemetry · 22:15 · Scheduled block”'
              : 'Full text on the lock screen'}
          </span>
          <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
            {(settings.notifPrivacy ?? !!settings.modules?.recovery) ? 'On' : 'Off'}
          </span>
        </button>
      </Section>

      {/* The fine print — the same documents the paywall links (3.1.2 requires
          them reachable in-app; they're bundled, so this works offline). */}
      <Section title="The fine print" hint="What the app does and doesn't do with your data.">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openLegal('privacy')}
            className="flex-1 rounded-lg border border-line bg-surface2 py-2.5 text-sm text-ink"
          >
            Privacy policy
          </button>
          <button
            type="button"
            onClick={() => openLegal('terms')}
            className="flex-1 rounded-lg border border-line bg-surface2 py-2.5 text-sm text-ink"
          >
            Terms of use
          </button>
        </div>
      </Section>

      <div className="space-y-2 border-t border-line pt-4">
        <button type="button" onClick={onOpenReview} className="w-full rounded-md border border-line py-3 text-sm font-medium text-ink">
          Open weekly review (Sunday Debrief)
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/?onboarding'
          }}
          className="w-full rounded-lg border border-line bg-surface2 py-3 text-sm text-ink"
        >
          Retake the diagnostic (re-types your profile)
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('telemetry:open-tour'))}
          className="w-full rounded-lg border border-line bg-surface2 py-3 text-sm text-ink"
        >
          Replay the tour (how the book works)
        </button>
        <button type="button" onClick={() => downloadJSON(exportData())} className="w-full rounded-lg border border-line bg-surface2 py-3 text-sm text-ink">
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

const THEME_OPTIONS = [
  { key: 'split_book', label: 'Split Book', sub: 'manila paper · carbon ink · daylight' },
  { key: 'lamplight', label: 'Lamplight', sub: 'amber-washed · quiet · evening' },
  { key: 'carbon', label: 'Carbon', sub: 'graphite dark · all-day' },
]

// Live theme switcher. Writes settings.theme (persisted on this device);
// ThemeProvider repaints <html> on next render.
function ThemePicker() {
  const { theme, setTheme } = useTheme()
  return (
    <Section title="Interface" hint="Your deck's visual system. Set per device.">
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((o) => {
          const on = theme === o.key
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                if (!on) selectionTick() // skin choice = a picker tick (P2)
                setTheme(o.key)
              }}
              aria-pressed={on}
              className={
                'rounded-lg border p-3 text-left transition-colors ' +
                (on ? 'border-accent bg-pos-soft' : 'border-line bg-surface2')
              }
            >
              <span className="block text-sm text-ink">{o.label}</span>
              <span className="mt-1 block text-[0.6875rem] leading-snug text-muted">{o.sub}</span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// Opt-in modules (handoff Proposed Addition #4): this is WHERE faith/recovery
// turn on — never inside a deck. Faith renders one un-scored card on Trends
// (R3); the forge reads these gates for the urge protocol's step pool.
const MODULE_OPTIONS = [
  { key: 'faith', label: 'Faith', sub: 'a verse + reading position in Trends — never scored' },
  { key: 'recovery', label: 'Recovery', sub: 'recovery framing in the urge protocol' },
  { key: 'monk', label: 'Monk mode', sub: 'stricter defaults across the deck' },
]

function ModulesSection({ settings, updateSettings }) {
  const modules = settings.modules || {}
  return (
    <Section title="Modules" hint="Opt-in only. Spiritual content is offered, not performed — and never a metric.">
      <div className="space-y-2">
        {MODULE_OPTIONS.map((m) => {
          const on = !!modules[m.key]
          return (
            <button
              key={m.key}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => updateSettings({ modules: { ...modules, [m.key]: !on } })}
              className={
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-quick ' +
                (on ? 'border-accent-deep bg-pos-soft' : 'border-line bg-surface2')
              }
            >
              <span
                aria-hidden
                className={`h-[7px] w-[7px] flex-none rounded-full ${on ? 'bg-accent shadow-glow-sm' : 'bg-line'}`}
              />
              <span className="flex-1">
                <span className="block text-sm text-ink">{m.label}</span>
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted">{m.sub}</span>
              </span>
              <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
                {on ? 'On' : 'Off'}
              </span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// The AI personalization switch the onboarding copy promises ("Change anytime
// in Settings" — this is that place). Source of truth is the survey blob's
// consent record, the same one the server-side Architect gate reads: when the
// AI coach is live, ON lets Claude (Anthropic) read the survey to compose the
// plan. This build composes on-device, so nothing leaves the phone either way
// — the copy below says exactly that.
const SURVEY_KEY = 'lockedin:__survey'

function readAiConsent() {
  try {
    const s = JSON.parse(localStorage.getItem(SURVEY_KEY) || 'null')
    return !!s?.consent?.aiProcessing
  } catch {
    return false
  }
}

function writeAiConsent(on) {
  try {
    const s = JSON.parse(localStorage.getItem(SURVEY_KEY) || 'null')
    if (!s || typeof s !== 'object') return
    s.consent = { ...(s.consent || {}), aiProcessing: on, provider: 'anthropic' }
    localStorage.setItem(SURVEY_KEY, JSON.stringify(s))
  } catch {
    /* quota / disabled — the toggle simply won't stick */
  }
}

function AiConsentSection() {
  const [on, setOn] = useState(readAiConsent)
  const toggle = () => {
    writeAiConsent(!on)
    setOn(!on)
  }
  return (
    <Section
      title="AI personalization — Claude"
      hint="When the AI coach is live, this lets Claude (Anthropic) read your survey answers to compose your plan. This version composes everything on-device — nothing leaves your phone either way."
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={
          'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-quick ' +
          (on ? 'border-accent-deep bg-pos-soft' : 'border-line bg-surface2')
        }
      >
        <span aria-hidden className={`h-[7px] w-[7px] flex-none rounded-full ${on ? 'bg-accent shadow-glow-sm' : 'bg-line'}`} />
        <span className="flex-1">
          <span className="block text-sm text-ink">Personalize with Claude</span>
          <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted">Named provider, off by default, sends nothing in this version.</span>
        </span>
        <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">{on ? 'On' : 'Off'}</span>
      </button>
    </Section>
  )
}

// De-boxed (G2): a section is a mono SectionLabel over a hairline, not a bordered
// box — so Settings reads as the same ledger, not a rounder different app.
function Section({ title, hint, children }) {
  return (
    <div className="border-b border-line pb-5 pt-1">
      <div className="font-clock text-[0.6875rem] font-medium uppercase tracking-widest2 text-muted">{title}</div>
      {hint && <p className="mb-3 mt-1 text-xs leading-snug text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
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
        className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-accent-ink disabled:opacity-40"
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
        className="rounded-lg border border-line bg-surface2 px-4 text-sm text-ink disabled:opacity-40"
      >
        Add
      </button>
    </div>
  )
}

// Restore from a JSON backup — the counterpart of Export. Fail-soft: a bad or
// unrecognized file leaves the store untouched and says so quietly.
function ImportButton({ onImport }) {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')
  async function onPick(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      setMsg(onImport(data) === false ? 'Import failed — file not recognized.' : 'Imported — data restored.')
    } catch {
      setMsg('Import failed — not valid JSON.')
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current && fileRef.current.click()}
        className="w-full rounded-lg border border-line bg-surface2 py-3 text-sm text-ink"
      >
        Import from backup (JSON)
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onPick}
      />
      {msg && <p className="text-center text-xs text-muted">{msg}</p>}
    </>
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
      <button type="button" onClick={() => setArmed(false)} className="flex-1 rounded-lg border border-line py-2 text-xs text-muted">
        Cancel
      </button>
      <button type="button" onClick={onWipe} className="flex-1 rounded-lg border border-muted py-2 text-xs text-ink">
        Tap again — erase everything
      </button>
    </div>
  )
}

// The subscriber's standing surface (P1). Reads the live entitlement; the
// manage link opens Apple's own subscription page (the only place cancel truly
// lives). Free users get the honest line + the door to the paywall.
function CoachSection() {
  const ent = useEntitlement()
  const status = ent?.status || 'none'
  const LINE = {
    none: 'Not hired — the book is free forever.',
    trial: 'On trial. Renews through the App Store unless cancelled.',
    active: 'Active. Managed through the App Store.',
    expired: 'Lapsed — the book kept every page.',
  }
  return (
    <Section title="The coach" hint="The AI layer — Guardian, weekly review, counsel. The book itself is never paid.">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink">{LINE[status] || LINE.none}</span>
        {status === 'trial' || status === 'active' ? (
          <a
            href="https://apps.apple.com/account/subscriptions"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-line bg-surface2 px-4 py-2.5 text-sm text-ink"
          >
            Manage
          </a>
        ) : (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('telemetry:open-paywall'))}
            className="shrink-0 rounded-lg border border-line bg-surface2 px-4 py-2.5 text-sm text-ink"
          >
            {status === 'expired' ? 'Re-hire' : 'See the coach'}
          </button>
        )}
      </div>
    </Section>
  )
}
