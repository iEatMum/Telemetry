// uiSchema.test.js — the Server-Driven UI safety normalizer.
//
// normalizeLayout turns ANY raw payload (including AI-authored ui_layouts) into a
// safe, renderable layout: malformed nodes are dropped, tab keys deduped,
// defaultTab guaranteed to exist, and — the hardening added here — tab/block
// counts and per-block config size are capped so a hallucinated or tampered
// payload can't render thousands of nodes or megabyte strings.
import { describe, it, expect } from 'vitest'
import { normalizeLayout, isRenderableLayout, SCHEMA_VERSION } from './uiSchema.js'

describe('normalizeLayout — happy path', () => {
  it('keeps a valid payload and generates block ids', () => {
    const l = normalizeLayout({
      defaultTab: 'today',
      tabs: [{ key: 'today', label: 'Today', blocks: [{ type: 'KpiGrid', config: { a: 1 } }] }],
    })
    expect(l.tabs.length).toBe(1)
    expect(l.tabs[0].blocks[0].type).toBe('KpiGrid')
    expect(l.tabs[0].blocks[0].id).toBe('KpiGrid-0')
    expect(l.tabs[0].blocks[0].config).toEqual({ a: 1 })
    expect(l.defaultTab).toBe('today')
    expect(isRenderableLayout(l)).toBe(true)
  })
})

describe('normalizeLayout — defensive dropping', () => {
  it('drops blocks with no usable type and tabs with no renderable blocks', () => {
    const l = normalizeLayout({
      tabs: [
        { key: 'a', blocks: [{ type: 'X' }, { no: 'type' }, 5, null] },
        { key: 'b', blocks: [] }, // no valid blocks → tab dropped
        'garbage',
      ],
    })
    expect(l.tabs.length).toBe(1)
    expect(l.tabs[0].key).toBe('a')
    expect(l.tabs[0].blocks.length).toBe(1)
  })

  it('de-dupes tab keys (first wins)', () => {
    const l = normalizeLayout({
      tabs: [
        { key: 'x', blocks: [{ type: 'A' }] },
        { key: 'x', blocks: [{ type: 'B' }] },
      ],
    })
    expect(l.tabs.length).toBe(1)
    expect(l.tabs[0].blocks[0].type).toBe('A')
  })

  it('falls defaultTab back to the first tab when it points nowhere', () => {
    const l = normalizeLayout({ defaultTab: 'nope', tabs: [{ key: 'first', blocks: [{ type: 'A' }] }] })
    expect(l.defaultTab).toBe('first')
  })

  it('returns an empty, non-renderable layout for garbage', () => {
    const l = normalizeLayout(null)
    expect(l.tabs).toEqual([])
    expect(l.defaultTab).toBeNull()
    expect(l.schemaVersion).toBe(SCHEMA_VERSION)
    expect(isRenderableLayout(l)).toBe(false)
  })
})

describe('normalizeLayout — hardening ceilings', () => {
  it('caps the number of tabs', () => {
    const many = { tabs: Array.from({ length: 50 }, (_, i) => ({ key: `t${i}`, blocks: [{ type: 'A' }] })) }
    expect(normalizeLayout(many).tabs.length).toBe(12)
  })

  it('caps the number of blocks per tab', () => {
    const bigTab = { tabs: [{ key: 't', blocks: Array.from({ length: 100 }, () => ({ type: 'A' })) }] }
    expect(normalizeLayout(bigTab).tabs[0].blocks.length).toBe(40)
  })

  it('neuters a pathologically large config to empty', () => {
    const huge = 'x'.repeat(25_000)
    const l = normalizeLayout({ tabs: [{ key: 't', blocks: [{ type: 'A', config: { text: huge } }] }] })
    expect(l.tabs[0].blocks[0].config).toEqual({})
  })

  it('preserves a normal-sized config', () => {
    const l = normalizeLayout({ tabs: [{ key: 't', blocks: [{ type: 'A', config: { text: 'ok' } }] }] })
    expect(l.tabs[0].blocks[0].config).toEqual({ text: 'ok' })
  })
})
