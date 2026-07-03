// BlockRenderer.jsx — the renderer half of the Server-Driven UI (P3.2).
//
// BlockRenderer turns ONE block ({type, config}) into a rendered widget by
// looking the type up in the registry allow-list. Two guarantees make a payload
// safe to render blind:
//   1. Unknown type → a quiet placeholder (forward-compat: an old app build can't
//      be force-updated, so a newer widget type must degrade, never crash).
//   2. A widget that throws is caught by a per-block error boundary, so one bad
//      block can't take down the whole screen.
// LayoutHost renders a full payload: a tab strip from layout.tabs + the active
// tab's blocks. This is the thin shell the real App.jsx becomes once widgets are
// wired to the live store.

import { Component, useEffect, useState } from 'react'
import { getWidget } from '../lib/registry.js'
import { recordSeen, recordUse, completeImpact } from '../lib/engagement.js'

// Quiet placeholder for a type this build doesn't know (or can't render).
function Placeholder({ title, detail }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface/50 px-4 py-5 text-center">
      <div className="font-clock text-[11px] uppercase tracking-widest2 text-muted">{title}</div>
      {detail && <div className="mt-1 text-xs text-muted/80">{detail}</div>}
    </div>
  )
}

// Per-block error boundary — isolates a throwing widget to its own slot.
class BlockBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.warn(`[BlockRenderer] "${this.props.type}" threw while rendering`, err)
  }
  render() {
    if (this.state.failed) {
      return <Placeholder title={this.props.type} detail="couldn't render this block" />
    }
    return this.props.children
  }
}

/** Render a single block. Unknown type → placeholder; throw → boundary.
 * `index` staggers the deal-in animation so blocks "deal" into the deck. */
export function BlockRenderer({ block, index = 0 }) {
  const id = block && block.id
  // Impression: this card was DEALT to the user. Fires once per mount per id
  // (re-mounts on tab switch count as new impressions, which is what we want).
  useEffect(() => {
    if (block && block.id) recordSeen(block)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!block || typeof block !== 'object' || !block.type) return null
  const Widget = getWidget(block.type)
  if (!Widget) {
    return <Placeholder title={block.type} detail="update the app to view this" />
  }

  // High-impact completion stays explicit (widgets call this); engagement is
  // automatic below.
  const track = { impactDone: (impactId) => completeImpact(impactId || block.id) }

  // Capture-phase click = ENGAGEMENT with this card. Any tap inside it counts,
  // so passive readouts get credited too without instrumenting every widget.
  // The wrapper also "deals" the card in (data-stream), staggered by index.
  return (
    <div
      className="animate-data-stream"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
      onClickCapture={() => recordUse(block)}
    >
      <BlockBoundary type={block.type}>
        <Widget config={block.config || {}} block={block} track={track} />
      </BlockBoundary>
    </div>
  )
}

/**
 * Render a whole normalized layout: a top tab strip + the active tab's blocks.
 * `defaultTab` (or the first tab) is selected on mount. Stateless beyond which
 * tab is active — the payload drives everything else.
 * `footer` renders INSIDE the scroll flow after the blocks (the Sync & Refactor
 * control lives here) — in-flow content can never trap anything beneath it.
 */
export function LayoutHost({ layout, footer }) {
  const tabs = (layout && layout.tabs) || []
  const [active, setActive] = useState(
    layout?.defaultTab && tabs.some((t) => t.key === layout.defaultTab)
      ? layout.defaultTab
      : tabs[0]?.key
  )
  const current = tabs.find((t) => t.key === active) || tabs[0]

  if (!tabs.length) {
    return (
      <div className="mx-auto max-w-app px-4 py-10">
        <Placeholder title="No layout" detail="nothing to render yet" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-app">
        {/* Sticks BELOW the shell's fixed LED strip (safe-area inset + 1.75rem),
            so the payload tabs never slide under it mid-scroll. */}
        <nav className="sticky top-[calc(env(safe-area-inset-top)+1.75rem)] z-10 flex gap-1 overflow-x-auto border-b border-line bg-bg/90 px-2 backdrop-blur">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 font-clock text-xs uppercase tracking-widest2 transition-colors ${
                t.key === active ? 'border-accent text-accent' : 'border-transparent text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className="pb-deck space-y-4 px-4 pt-5">
          {(current?.blocks || []).map((b, i) => (
            <BlockRenderer key={b.id ?? i} block={b} index={i} />
          ))}
          {footer && <div className="pt-2">{footer}</div>}
        </main>
      </div>
    </div>
  )
}
