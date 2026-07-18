// GuardianPanel.jsx — the Guardian's review surface.
//
// Explainability is the product: the drift sentinel's assessment is shown as
// its named vectors with the evidence beside each ("data, not verdict"). The
// composite 0-100 number is deliberately NEVER rendered — a single risk score
// invites the same all-or-nothing reading as the banned red/green trackers.
// Below the live read: the urge record (wins AND resets as neutral history —
// the lifetime piles only grow) and what the protocol forge has learned about
// which steps actually work for this user.

import { useStore } from '../lib/store.jsx'
import { useDriftSentinel, getInvocations } from '../lib/guardianEngine.js'
import { stepStats, STEP_LIBRARY } from '../lib/protocolForge.js'
import { streakDays } from '../lib/dates.js'
import { useEntitlement } from '../lib/purchases.js'
import { CoachGate } from '../components/Paywall.jsx'
import { Card, SectionLabel, LedgerNotice, LifetimePile, BarMeter } from '../components/ui.jsx'

const BAND_TONE = { stable: 'text-pos', watch: 'text-warn', critical: 'text-neg' }
const BAND_LINE = {
  stable: 'Conditions steady. Nothing to act on.',
  watch: 'Conditions drifting. One quiet move keeps it that way.',
  critical: 'Multiple signals stacked. The next scheduled block is the move.',
}

function VectorRow({ v }) {
  const tone = !v.evidence ? 'bg-line' : v.score >= 0.6 ? 'bg-neg' : v.score > 0 ? 'bg-warn' : 'bg-pos'
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${tone}`} />
      <span className="flex-1 text-[0.8125rem] text-ink">{v.note}</span>
      {!v.evidence && (
        <span className="font-clock text-[0.625rem] uppercase tracking-wide text-muted/70">no data</span>
      )}
    </div>
  )
}

export default function GuardianPanel() {
  const { streak } = useStore()
  const drift = useDriftSentinel()
  // The drift sentinel + protocol intelligence ARE the coach (M0.1). The
  // Record stays free — it's the user's own book, never behind the register.
  // The urge protocol itself is untouched by this gate (safety is free).
  const { entitled } = useEntitlement()

  const wins = streak.urgesSurvived || []
  const resets = streak.resets || []
  const days = streakDays(streak.startedAt)
  const stats = stepStats(getInvocations(), streak)
  const learned = Object.entries(stats)
    .map(([id, s]) => ({ ...s, id, step: STEP_LIBRARY.find((x) => x.id === id) }))
    .filter((r) => r.step)
    .sort((a, b) => b.score - a.score)

  // Recent urge moments, newest first — wins and resets interleaved as one
  // neutral timeline. A reset row reads identically calm to a win row.
  const timeline = [
    ...wins.map((w) => ({ at: w.at, kind: 'outlasted' })),
    ...resets.map((r) => ({ at: r.at, kind: 'reset' })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8)

  return (
    <div className="space-y-5">
      {/* Live drift read — coach-gated */}
      <div>
        <SectionLabel className="mb-2 px-1">Drift sentinel</SectionLabel>
        {!entitled ? (
          <CoachGate line="The sentinel reads sleep, engagement, and your danger window — and names the drift before it lands." />
        ) : (
          <Card>
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
              <span className={`font-clock text-sm font-semibold uppercase tracking-widest2 ${BAND_TONE[drift?.band] || 'text-muted'}`}>
                {drift ? drift.band : 'reading…'}
              </span>
              {drift?.window?.label && (
                <span className="text-xs text-muted">watch window {drift.window.label}</span>
              )}
            </div>
            {drift ? (
              <>
                <div className="divide-y divide-line/50">
                  {drift.vectors.map((v) => (
                    <VectorRow key={v.key} v={v} />
                  ))}
                </div>
                <p className="border-t border-line px-4 py-3 text-[0.75rem] leading-relaxed text-muted">
                  {BAND_LINE[drift.band]}
                </p>
              </>
            ) : (
              <div className="px-4 py-3">
                <LedgerNotice>Assessing today's signals…</LedgerNotice>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* The record — permanent piles + the neutral timeline */}
      <div>
        <SectionLabel className="mb-2 px-1">The record</SectionLabel>
        <Card className="p-4">
          <div className="flex justify-around">
            <LifetimePile value={days} label="day run" />
            <LifetimePile value={wins.length} label="urges outlasted" />
            <LifetimePile value={resets.length} label="resets · data" />
          </div>
        </Card>
        {timeline.length > 0 && (
          <Card className="mt-3">
            <div className="divide-y divide-line/50">
              {timeline.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  {/* Ledger, not scoreboard: win and reset rows carry IDENTICAL
                      visual weight — only the word differs (BLUEPRINT P-6). */}
                  <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
                    {e.kind}
                  </span>
                  <span className="font-clock tnum text-xs text-muted">
                    {new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(e.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* What the forge has learned — coach-gated (the LEARNING is the coach;
          the urge protocol itself always deals a full hand for free) */}
      <div>
        <SectionLabel className="mb-2 px-1">Protocol intelligence</SectionLabel>
        {!entitled ? (
          <CoachGate line="Every night-page run teaches the forge which steps hold for you — the next deal adapts." />
        ) : learned.length ? (
          <Card className="space-y-3 p-4">
            {learned.map((r) => (
              <BarMeter
                key={r.id}
                label={r.step.label.slice(0, 44)}
                value={Math.round(r.score * 100)}
                max={100}
                tone={r.score >= 0.5 ? 'accent' : 'warn'}
                right={`${r.wins}W · ${r.losses}L`}
              />
            ))}
          </Card>
        ) : (
          <LedgerNotice>
            No protocol history yet. Each Outlast It run teaches the forge which steps hold for you —
            the next deal adapts.
          </LedgerNotice>
        )}
      </div>
    </div>
  )
}
