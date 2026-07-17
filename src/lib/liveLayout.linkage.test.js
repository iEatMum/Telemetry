// liveLayout.linkage.test.js — survey → SDUI block linkage (density, athletic
// injection, health streams). Pure functions over a minimal mock store.
import { describe, it, expect } from 'vitest'
import { buildLiveLayout, densityTier, applyDensity } from './liveLayout.js'

// Minimal store shape the builder reads (only what these tests exercise).
const baseStore = (settings = {}) => ({
  settings: { wakeTime: '05:30', bedTime: '22:15', ...settings },
  streak: { startedAt: null, resets: [], urgesSurvived: [], cleanDates: [], bestSeconds: 0 },
  checklist: {},
  tasks: [],
  sprints: [],
  runs: [],
  income: [],
  wellness: {},
  reading: {},
})

const findTab = (layout, key) => layout.tabs.find((t) => t.key === key)
const schedRows = (layout) => findTab(layout, 'today').blocks.find((b) => b.type === 'ScheduleMatrix').config.rows
const trendTypes = (layout) => findTab(layout, 'trends').blocks.map((b) => b.type)

describe('densityTier + applyDensity (executionRate7d)', () => {
  it('maps the baseline to a tier', () => {
    expect(densityTier(1)).toBe('ramp')
    expect(densityTier(4)).toBe('standard')
    expect(densityTier(7)).toBe('elite')
    expect(densityTier(null)).toBe('standard')
  })
  it('ramp caps rows at 3 but never hides a high-impact block', () => {
    const rows = [
      { block: 'a', impact: 'high' }, { block: 'b', impact: 'high' }, { block: 'c', impact: 'high' },
      { block: 'd' }, { block: 'e' },
    ]
    const out = applyDensity(rows, 'ramp')
    expect(out).toHaveLength(3)
    expect(out.every((r) => r.impact === 'high')).toBe(true) // low-impact shed first
  })
  it('elite keeps everything', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ block: String(i) }))
    expect(applyDensity(rows, 'elite')).toHaveLength(8)
  })
})

describe('focusGoal → athletic block injected after the anchor', () => {
  it('running injects a track/tempo block right after the wake anchor', () => {
    const layout = buildLiveLayout(baseStore({ focusGoal: 'running', executionRate7d: 7, anchorHabit: 'shower' }), {})
    const rows = schedRows(layout)
    const idx = rows.findIndex((r) => /Track \/ tempo/.test(r.block))
    expect(idx).toBeGreaterThan(-1)
    expect(rows[0].block).toMatch(/Wake/) // anchor
    expect(idx).toBe(1) // immediately after it
  })
  it('gym injects a lift block; work/reading inject none', () => {
    const gym = schedRows(buildLiveLayout(baseStore({ focusGoal: 'gym', executionRate7d: 7 }), {}))
    expect(gym.some((r) => /Lift/.test(r.block))).toBe(true)
    const work = schedRows(buildLiveLayout(baseStore({ focusGoal: 'work', executionRate7d: 7 }), {}))
    expect(work.some((r) => /Lift|Track/.test(r.block))).toBe(false)
  })
  it('the internal _tag never leaks into the payload', () => {
    const rows = schedRows(buildLiveLayout(baseStore({ focusGoal: 'running', executionRate7d: 7 }), {}))
    expect(rows.every((r) => !('_tag' in r))).toBe(true)
  })
})

describe('dayBlocks — the dictated day prints on the schedule', () => {
  it('timed dictation lands in time order; untimed follows the spine', () => {
    const rows = schedRows(
      buildLiveLayout(
        baseStore({
          executionRate7d: 7,
          dayBlocks: [
            { id: 'a', time: '09:00', block: 'Chem — study block', impact: 'high' },
            { id: 'b', time: '', block: 'Call home' },
          ],
        }),
        {}
      )
    )
    const chem = rows.findIndex((r) => r.block === 'Chem — study block')
    const wake = rows.findIndex((r) => /Wake/.test(r.block))
    const phone = rows.findIndex((r) => /Phone out/.test(r.block))
    expect(chem).toBeGreaterThan(wake)
    expect(chem).toBeLessThan(phone) // 09:00 sits before the 22:15 bookend
    expect(rows.find((r) => r.block === 'Chem — study block').impact).toBe('high') // ◆ survives
    expect(rows[rows.length - 1].block).toBe('Call home')
  })
  it('no invented rows: without dictation or a focus goal the day is just the two bookends', () => {
    const rows = schedRows(buildLiveLayout(baseStore({ executionRate7d: 7 }), {}))
    expect(rows).toHaveLength(2)
    expect(rows.some((r) => /Morning run/.test(r.block))).toBe(false) // the built-for-one row is gone
  })
})

describe('brand-new book → minimal first page (progressive disclosure)', () => {
  it('deals first-steps + schedule + timer only — no zeroed instruments', () => {
    const store = baseStore({ executionRate7d: 7, focusGoal: 'work' })
    store.streak.startedAt = new Date().toISOString() // opened moments ago
    const today = findTab(buildLiveLayout(store, {}), 'today').blocks
    expect(today.map((b) => b.type)).toEqual(['InsightCard', 'ScheduleMatrix', 'DeepWorkTimer'])
    expect(today[0].id).toBe('live-first-steps')
  })
  it('a day-0 RESET (data exists) still gets the full lifetime-led deck', () => {
    const store = baseStore({ executionRate7d: 7 })
    store.streak.startedAt = new Date().toISOString()
    store.streak.cleanDates = ['2026-07-01']
    store.streak.resets = [{ at: new Date().toISOString() }]
    const today = findTab(buildLiveLayout(store, {}), 'today').blocks
    expect(today[0].id).toBe('live-lifetime-today')
  })
})

describe('healthIntegration → BiometricChart streams vs disabled state', () => {
  it('unlinked → one functional "Integration Disabled" card, no BiometricChart', () => {
    const layout = buildLiveLayout(baseStore({ healthIntegration: { linked: false } }), {})
    expect(trendTypes(layout)).not.toContain('BiometricChart')
    const off = findTab(layout, 'trends').blocks.find((b) => b.id === 'live-bio-off')
    expect(off.type).toBe('InsightCard')
    expect(off.config.text).toMatch(/Not linked — tap Connect Apple Health/)
  })
  it('linked with metrics → a BiometricChart per selected metric with real data arrays', () => {
    const layout = buildLiveLayout(
      baseStore({ healthIntegration: { linked: true, providers: ['apple-health'], synchronizedMetrics: ['sleep', 'heart-rate'] } }),
      {},
    )
    const bios = findTab(layout, 'trends').blocks.filter((b) => b.type === 'BiometricChart')
    expect(bios).toHaveLength(2)
    expect(bios[0].config.data.length).toBeGreaterThan(0)
    expect(typeof bios[0].config.value).toBe('number')
  })
  it('activity linked → EnergyTrendLine rides the activity stream + relabels', () => {
    const layout = buildLiveLayout(
      baseStore({ healthIntegration: { linked: true, synchronizedMetrics: ['activity'] } }),
      {},
    )
    const energy = findTab(layout, 'trends').blocks.find((b) => b.type === 'EnergyTrendLine')
    expect(energy.config.label).toMatch(/Activity/)
    expect(energy.config.points.length).toBeGreaterThan(0)
  })
})

describe('targets — only instruments a shipping user can move (Amendment A1.5)', () => {
  it('a plain store gets NO Targets block at all (no readiness, no focus item)', () => {
    const layout = buildLiveLayout(baseStore(), {})
    const types = findTab(layout, 'today').blocks.map((b) => b.type)
    expect(types).not.toContain('GoalProgress')
  })

  it('the dead income/mileage instruments never render anywhere in the layout', () => {
    const layout = buildLiveLayout(baseStore({ focusGoal: 'work', executionRate7d: 7 }), {})
    const labels = layout.tabs.flatMap((t) =>
      t.blocks.flatMap((b) => (b.config?.items || []).map((i) => i.label || ''))
    )
    expect(labels.join(' ')).not.toMatch(/income|mileage/i)
  })

  it('a focus goal earns its one real target row', () => {
    const layout = buildLiveLayout(baseStore({ focusGoal: 'work', executionRate7d: 7 }), {})
    const goals = findTab(layout, 'today').blocks.find((b) => b.type === 'GoalProgress')
    expect(goals).toBeTruthy()
    expect(goals.config.items.map((i) => i.label)).toContain('Weekly deep-work')
  })
})
