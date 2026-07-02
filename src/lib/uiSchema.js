// uiSchema.js — the Server-Driven UI contract (P3.2).
//
// The whole Generative-UI idea rests on ONE thing: the server (later, an AI)
// sends DATA, never code. That data is a tree of "blocks", each naming a widget
// `type` that the client looks up in its own allow-list (see registry.js). The
// client decides what `type` is allowed to mean — a payload can never inject a
// component or run logic. This file is the shape of that data + a defensive
// normalizer that turns anything we receive into something safe to render.
//
// THE PAYLOAD
//   {
//     schemaVersion: 1,
//     defaultTab: 'today',
//     tabs: [
//       { key: 'today', label: 'Today', blocks: [
//         { type: 'ScheduleMatrix', id: 'sched', config: { ... } },
//         { type: 'KpiGrid',        id: 'kpis',  config: { ... } }
//       ] }
//     ]
//   }
//
// Three owners of data (kept straight on purpose):
//   • layout  — which tabs, which blocks, what order      → AI (this payload)
//   • config  — a block's parameters (target, label, …)   → AI (inside config)
//   • live state — did you do it, streak count, logs       → local-first store
// P3.2 carries sample data inside `config` so we can render with no backend;
// wiring widgets to the live store is a later phase.

export const SCHEMA_VERSION = 1

// Defensive ceilings — the payload can be authored by an AI (ui_layouts), so a
// hallucinated or tampered layout must never render thousands of nodes or
// megabyte strings. Anything past these is dropped before it reaches the renderer.
const MAX_TABS = 12
const MAX_BLOCKS_PER_TAB = 40
const MAX_CONFIG_BYTES = 20_000

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v)

// A single block: { type:string, id?:string, config?:object }. Returns a clean
// block, or null if it can't be salvaged (no usable string type).
function normalizeBlock(raw, index) {
  if (!isObj(raw)) return null
  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  if (!type) return null
  let config = isObj(raw.config) ? raw.config : {}
  // Neuter a pathologically large config (bloated strings / deep junk) to empty
  // rather than render it — the widget falls back to its own defaults.
  try {
    if (JSON.stringify(config).length > MAX_CONFIG_BYTES) config = {}
  } catch {
    config = {} // circular / non-serializable — not something we'll render
  }
  return {
    type,
    id: typeof raw.id === 'string' && raw.id ? raw.id : `${type}-${index}`,
    config,
  }
}

// A single tab: { key, label, blocks[] }. Returns null if there's nothing
// renderable (no key, or zero valid blocks).
function normalizeTab(raw, index) {
  if (!isObj(raw)) return null
  const key = typeof raw.key === 'string' && raw.key ? raw.key : `tab-${index}`
  const label =
    typeof raw.label === 'string' && raw.label ? raw.label : key.replace(/^\w/, (c) => c.toUpperCase())
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.slice(0, MAX_BLOCKS_PER_TAB).map((b, i) => normalizeBlock(b, i)).filter(Boolean)
    : []
  if (!blocks.length) return null
  return { key, label, blocks }
}

/**
 * Turn ANY raw payload into a safe, renderable layout. Drops malformed tabs and
 * blocks rather than throwing — a bad block can never take down the screen. De-
 * dupes tab keys, and guarantees `defaultTab` points at a tab that exists.
 * Returns an EMPTY-tabs layout if nothing is salvageable (caller falls back).
 */
export function normalizeLayout(raw) {
  const src = isObj(raw) ? raw : {}
  const seen = new Set()
  const tabs = (Array.isArray(src.tabs) ? src.tabs : [])
    .slice(0, MAX_TABS)
    .map((t, i) => normalizeTab(t, i))
    .filter(Boolean)
    .filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)))

  const defaultTab =
    typeof src.defaultTab === 'string' && tabs.some((t) => t.key === src.defaultTab)
      ? src.defaultTab
      : tabs[0]?.key || null

  return {
    schemaVersion: Number.isInteger(src.schemaVersion) ? src.schemaVersion : SCHEMA_VERSION,
    defaultTab,
    tabs,
  }
}

/** True if a normalized layout has at least one tab to render. */
export function isRenderableLayout(layout) {
  return isObj(layout) && Array.isArray(layout.tabs) && layout.tabs.length > 0
}
