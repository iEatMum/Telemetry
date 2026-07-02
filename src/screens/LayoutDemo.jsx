// LayoutDemo.jsx — TEMPORARY P3.2/P3.3/P3.4 proof (remove before ship).
//
// Renders the active layout through the FULL pipeline via the real loader
// (useLayout → server | cache | bundled default → normalizeLayout → LayoutHost),
// and demonstrates the client-side Performance Loop:
//   • engagement is tracked as you interact (BlockRenderer + the widgets)
//   • the Daily Briefing's config is fed LIVE from that engagement
//   • "Finish day · Sync & Refactor" closes the day + builds the Performance
//     Payload (logged to the console; no backend touched)
//
// Reachable at /?demo=layout (wired in main.jsx). Also injects one unknown block
// type to keep proving graceful degradation.

import { useLayout } from '../lib/layout.js'
import { normalizeLayout } from '../lib/uiSchema.js'
import { LayoutHost } from '../components/BlockRenderer.jsx'
import RefactorIndicator from '../components/RefactorIndicator.jsx'
import { useEngagementSummary, refactorSignals } from '../lib/engagement.js'

// Turn the live engagement summary into the DailyBriefing's config — exactly the
// shape the Architect will emit later, built client-side now.
function briefingConfig(sum) {
  const imp = sum.impact
  const impactTone = !imp.total ? 'muted' : imp.done === imp.total ? 'pos' : 'neg'
  return {
    date: sum.closed ? `${sum.day} · closed` : `${sum.day} · live`,
    stats: [
      { label: 'Impact', value: `${imp.done}/${imp.total || 0}`, tone: impactTone },
      { label: 'Engaged', value: `${sum.engagementRate}%`, tone: sum.engagementRate >= 50 ? 'pos' : 'warn' },
      { label: 'Cards', value: `${sum.used.length}/${sum.widgets.length}`, tone: 'muted' },
    ],
    drivers: refactorSignals(sum),
  }
}

function decorate(layout, sum) {
  const clone = JSON.parse(JSON.stringify(layout))
  const today = clone.tabs.find((t) => t.key === 'today')
  if (today) {
    const brief = today.blocks.find((b) => b.type === 'DailyBriefing')
    if (brief) brief.config = briefingConfig(sum)
  }
  const mind = clone.tabs.find((t) => t.key === 'mind')
  if (mind) mind.blocks.push({ type: 'HolographicCoach', id: 'demo-unknown', config: {} })
  return normalizeLayout(clone)
}

export default function LayoutDemo() {
  const { layout, source, status } = useLayout()
  const summary = useEngagementSummary()

  return (
    <>
      <LayoutHost layout={decorate(layout, summary)} />

      {/* Sync & Refactor control, pinned above the home indicator */}
      <div className="fixed bottom-3 left-1/2 z-50 w-full max-w-app -translate-x-1/2 px-4 pb-safe">
        <RefactorIndicator className="w-full" />
      </div>

      {/* dev source badge */}
      <div className="fixed bottom-20 right-2 z-50 rounded-md border border-line bg-surface px-2.5 py-1 font-clock text-[10px] uppercase tracking-widest2 text-muted">
        layout · {source}
        {status === 'loading' ? ' · loading' : status === 'error' ? ' · offline' : ''}
      </div>
    </>
  )
}
