// HandoverComposer.jsx — the Surrender point, as an embeddable section.
//
// Extracted from the old Handover screen so it can live inside the Evening Examen
// ("hand it over"). The composer + the press-and-hold ritual + saved drafts +
// the Guardian's-voice tester (tucked into a collapsible). The resulting
// Considerations are rendered separately, in the Examen's Consider stream.

import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Chip, HoldButton } from './ui.jsx'
import { fireManualAlert, alertTemplates, notificationStatus } from '../lib/guardian.js'
import { requestNotificationPermission, enableGuardianAlerts, pushConfigured } from '../lib/push.js'

const KINDS = ['screen time', 'run', 'night', 'note']

export default function HandoverComposer() {
  const { handover, saveHandoverDraft, discardHandoverDraft, surrenderHandover } = useStore()

  const [kind, setKind] = useState('note')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState([])
  const [confirmed, setConfirmed] = useState(false)

  const canSurrender = body.trim().length > 0 || attachments.length > 0

  function onFiles(e) {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size, type: f.type }))])
    e.target.value = ''
  }
  function clearComposer() {
    setBody('')
    setAttachments([])
    setKind('note')
  }
  function onSurrender() {
    surrenderHandover({ kind, body, attachments })
    clearComposer()
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 4000)
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <h2 className="font-clock text-[13px] uppercase tracking-[0.18em] text-muted">Handover</h2>
        <p className="max-w-[40ch] text-[13px] leading-relaxed text-muted">
          Give it to the Guardian — the night, the numbers, the run. What you hand
          over, it carries.
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-4">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k}
            </Chip>
          ))}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What happened? Paste the numbers — Screen Time, the run, the night. Say it plainly."
          className="mt-3 w-full resize-none rounded-xl bg-surface2 px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-muted focus:outline-none"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-full bg-surface2 px-3 py-1.5 text-xs text-muted">
            + attach
            <input type="file" multiple accept="image/*,text/*" onChange={onFiles} className="hidden" />
          </label>
          {attachments.map((a, i) => (
            <span key={i} className="rounded-full bg-surface2 px-3 py-1.5 font-clock text-[11px] text-muted">{a.name}</span>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <HoldButton disabled={!canSurrender} onComplete={onSurrender} />
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={!canSurrender}
              onClick={() => {
                saveHandoverDraft({ kind, body, attachments })
                clearComposer()
              }}
              className="text-xs uppercase tracking-wide text-muted disabled:opacity-40"
            >
              Save for later
            </button>
            <p className="text-[11px] text-muted">Stays on this phone.</p>
          </div>
        </div>
      </div>

      {confirmed && (
        <p className="px-1 text-[13px] leading-relaxed text-muted">
          Handed over. The Guardian has it — it&rsquo;s in your Consider list below.
        </p>
      )}

      {handover.drafts.length > 0 && (
        <div className="space-y-2">
          <div className="px-1 font-clock text-[11px] uppercase tracking-wide text-muted">Held — not yet surrendered</div>
          {handover.drafts.map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              onResume={() => {
                setKind(d.kind)
                setBody(d.body)
                setAttachments(d.attachments || [])
                discardHandoverDraft(d.id)
              }}
              onDiscard={() => discardHandoverDraft(d.id)}
            />
          ))}
        </div>
      )}

      <GuardianVoiceTester />
    </section>
  )
}

// HoldButton is imported from ui.jsx

function DraftRow({ draft, onResume, onDiscard }) {
  const count = (draft.attachments || []).length
  const preview = (draft.body || '').trim() || `(${count} attachment${count === 1 ? '' : 's'})`
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5">
      <button type="button" onClick={onResume} className="min-w-0 flex-1 text-left">
        <div className="font-clock text-[10px] uppercase tracking-wide text-muted">{draft.kind}</div>
        <div className="truncate text-[14px] text-ink">{preview}</div>
      </button>
      <button type="button" onClick={onDiscard} aria-label="Discard draft" className="px-2 text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

// The Manual Guardian Alert — tucked into a collapsible so it doesn't crowd the
// ritual. Tests how the Guardian sounds; every line is screened for shame first.
function GuardianVoiceTester() {
  const [status, setStatus] = useState(() => notificationStatus())
  const [feedback, setFeedback] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [enableMsg, setEnableMsg] = useState('')

  useEffect(() => {
    setStatus(notificationStatus())
  }, [])

  async function enable() {
    setEnableMsg('Turning it on…')
    const res = await enableGuardianAlerts()
    setStatus(notificationStatus())
    if (res.ok) setEnableMsg('On. The Guardian can reach this phone when the record drifts.')
    else if (res.reason === 'no-vapid-key') setEnableMsg('Not configured yet — the push keys (VAPID) aren’t set on the server.')
    else if (res.reason === 'permission') setEnableMsg(status.needsInstall ? 'On iPhone, add Telemetry to your Home Screen first, then allow notifications.' : 'Allow notifications to let the Guardian reach you.')
    else setEnableMsg('Couldn’t turn it on here. Try on the installed app.')
  }

  async function test() {
    setFeedback('')
    let perm = status.permission
    if (perm !== 'granted') {
      perm = await requestNotificationPermission()
      setStatus(notificationStatus())
    }
    if (perm !== 'granted') {
      setFeedback(
        status.needsInstall
          ? 'On iPhone, add Telemetry to your Home Screen first — then allow notifications.'
          : 'Notifications are off. Allow them to hear the Guardian.'
      )
      return
    }
    const res = await fireManualAlert(templateId || undefined)
    if (res.ok) setFeedback(`Sent: “${res.template.title}”. Check your notifications.`)
    else if (res.reason === 'blocked') setFeedback(`Held back — that line contains “${res.banned}”. The Guardian won’t send shame. Edit guardianPersona.json.`)
    else if (res.reason === 'no-sw') setFeedback('Service worker isn’t active here (off in dev). Test on the installed app.')
    else setFeedback('Could not show it. Check notification settings.')
  }

  return (
    <details className="rounded-2xl bg-surface p-4">
      <summary className="cursor-pointer font-clock text-[11px] uppercase tracking-[0.18em] text-muted">
        The Guardian&rsquo;s voice
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-[13px] leading-relaxed text-muted">
          Test how the Guardian sounds. Tune the tone in <span className="font-clock text-ink">guardianPersona.json</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip active={templateId === ''} onClick={() => setTemplateId('')}>surprise me</Chip>
          {alertTemplates.map((t) => (
            <Chip key={t.id} active={templateId === t.id} onClick={() => setTemplateId(t.id)}>{t.title}</Chip>
          ))}
        </div>
        <button type="button" onClick={test} className="w-full rounded-2xl bg-surface2 py-3 text-sm font-semibold text-ink">Send a test alert</button>
        {feedback && <p className="text-[12px] leading-relaxed text-muted">{feedback}</p>}

        {pushConfigured() && (
          <div className="space-y-2 border-t border-line pt-3">
            <p className="text-[13px] leading-relaxed text-muted">
              Let the Guardian reach this phone when the Referee sees you drift —
              a late wake, a missed night.
            </p>
            <button type="button" onClick={enable} className="w-full rounded-2xl bg-surface2 py-3 text-sm font-semibold text-ink">
              Enable the Guardian&rsquo;s Pulse
            </button>
            {enableMsg && <p className="text-[12px] leading-relaxed text-muted">{enableMsg}</p>}
          </div>
        )}
      </div>
    </details>
  )
}
