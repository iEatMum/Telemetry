// flowResolver.test.js — the onboarding decision-graph runtime, pure-tested.
import { describe, it, expect } from 'vitest'
import { read, evalValidate, resolveNext, normalizeFlow, getNode, longestPath, longestPathFrom } from './flowResolver.js'
import FLOW from './onboardingFlow.json'

const flow = normalizeFlow(FLOW)
const node = (id) => getNode(flow, id)

describe('read (dotted path)', () => {
  it('reads nested slices and returns undefined for gaps', () => {
    expect(read({ modules: { recovery: true } }, 'modules.recovery')).toBe(true)
    expect(read({ modules: {} }, 'modules.recovery')).toBeUndefined()
    expect(read({}, 'a.b.c')).toBeUndefined()
  })
})

describe('evalValidate', () => {
  it('no rule → always advanceable (optional steps)', () => {
    expect(evalValidate(undefined, {})).toBe(true)
  })
  it('isInt gates on an actual integer, not null', () => {
    expect(evalValidate({ var: 'executionRate7d', op: 'isInt' }, { executionRate7d: 0 })).toBe(true)
    expect(evalValidate({ var: 'executionRate7d', op: 'isInt' }, { executionRate7d: null })).toBe(false)
  })
  it('all: requires every sub-rule (engine node)', () => {
    const v = node('engine').validate
    expect(evalValidate(v, { wakeTime: '05:30', peakWindow: 'morning' })).toBe(true)
    expect(evalValidate(v, { wakeTime: '05:30', peakWindow: null })).toBe(false)
  })
})

describe('F1/F2 — executionRate7d forks the anchor step', () => {
  it('ramp (≤2) requires the anchor and sets anchorRequired', () => {
    const t = resolveNext(node('executionRate7d'), { executionRate7d: 1 })
    expect(t.goto).toBe('anchorHabit')
    expect(t.set).toEqual({ anchorRequired: true })
  })
  it('elite (≥6) SKIPS the anchor, jumping to protocols', () => {
    const t = resolveNext(node('executionRate7d'), { executionRate7d: 7 })
    expect(t.goto).toBe('protocols')
    expect(t.set).toBeNull()
  })
  it('standard (3–5) falls through to the anchor by default', () => {
    expect(resolveNext(node('executionRate7d'), { executionRate7d: 4 }).goto).toBe('anchorHabit')
  })
})

describe('F3 — dangerWindow surfaces counterMove only for late-night + recovery', () => {
  it('late-night AND recovery → counterMove', () => {
    const t = resolveNext(node('dangerWindow'), { dangerWindow: 'late-night', modules: { recovery: true } })
    expect(t.goto).toBe('counterMove')
  })
  it('late-night WITHOUT recovery → skips to engine', () => {
    const t = resolveNext(node('dangerWindow'), { dangerWindow: 'late-night', modules: { recovery: false } })
    expect(t.goto).toBe('engine')
  })
  it('a different window never surfaces counterMove even with recovery on', () => {
    const t = resolveNext(node('dangerWindow'), { dangerWindow: 'evening', modules: { recovery: true } })
    expect(t.goto).toBe('engine')
  })
})

describe('F4 — mission unlocks the confidence check only when typed', () => {
  it('non-empty mission → missionConfidence', () => {
    expect(resolveNext(node('mission'), { mission: 'sub-1:50' }).goto).toBe('missionConfidence')
  })
  it('blank mission → skips confidence, straight to slipResponse', () => {
    expect(resolveNext(node('mission'), { mission: '' }).goto).toBe('slipResponse')
  })
})

describe('F5 — ghost recommends the social stake', () => {
  it('ghost sets recommendSocial but still advances to streakModel', () => {
    const t = resolveNext(node('slipResponse'), { slipResponse: 'ghost' })
    expect(t.goto).toBe('streakModel')
    expect(t.set).toEqual({ recommendSocial: true })
  })
  it('a non-ghost response actively CLEARS the recommendation (A1 rd2 fix)', () => {
    // Was `set: null` — which left a stale recommendSocial:true after a
    // ghost→BACK→non-ghost backtrack. The defaultSet now clears it.
    const t = resolveNext(node('slipResponse'), { slipResponse: 'shrug' })
    expect(t.goto).toBe('streakModel')
    expect(t.set).toEqual({ recommendSocial: false })
  })
})

describe('normalizeFlow — defensive', () => {
  it('rewrites a dangling goto to the next linear node (never a dead end)', () => {
    const raw = {
      entryId: 'a',
      nodes: [
        { id: 'a', type: 'X', next: { default: 'ghost-node' } }, // dangling default
        { id: 'b', type: 'X' },
      ],
    }
    const nf = normalizeFlow(raw)
    expect(getNode(nf, 'a').next.default).toBe('b') // repaired to the next node
  })
  it('drops junk nodes and dedupes ids, and repairs a bad entryId', () => {
    const nf = normalizeFlow({ entryId: 'nope', nodes: [null, { id: 'a', type: 'X' }, { id: 'a', type: 'X' }, { type: 'X' }] })
    expect(nf.nodes.map((n) => n.id)).toEqual(['a'])
    expect(nf.entryId).toBe('a')
  })
  it('the shipped flow is fully connected — no goto/default dangles', () => {
    const ids = new Set(flow.nodes.map((n) => n.id))
    for (const n of flow.nodes) {
      if (!n.next) continue
      for (const b of n.next.branches || []) expect(ids.has(b.goto)).toBe(true)
      if (n.next.default) expect(ids.has(n.next.default)).toBe(true)
    }
  })
})

describe('new nodes — focusGoal + healthIntegration wiring', () => {
  it('engine routes into focusGoal, focusGoal into dayBlocks (dictation), dayBlocks into mission', () => {
    expect(resolveNext(node('engine'), { wakeTime: '05:30', peakWindow: 'morning' }).goto).toBe('focusGoal')
    expect(resolveNext(node('focusGoal'), { focusGoal: 'running' }).goto).toBe('dayBlocks')
    expect(resolveNext(node('dayBlocks'), { dayBlocks: [{ block: 'Chem — study block' }] }).goto).toBe('mission')
  })
  it('theme routes into healthIntegration, healthIntegration into stakePref', () => {
    expect(resolveNext(node('theme'), { theme: 'split_book' }).goto).toBe('healthIntegration')
    expect(resolveNext(node('healthIntegration'), {}).goto).toBe('stakePref')
  })
  it('healthIntegration is optional (no validate → always advanceable)', () => {
    expect(evalValidate(node('healthIntegration').validate, {})).toBe(true)
  })
})

describe('longestPath', () => {
  it('counts the deepest branch (through counterMove), excluding the commit node', () => {
    // executionRate7d→anchor→protocols→timeLeak→dangerWindow→counterMove→engine
    // →focusGoal→dayBlocks→mission→missionConfidence→slipResponse→streakModel
    // →theme→healthIntegration→stakePref = 16
    expect(longestPath(flow)).toBe(16)
  })
})

describe('slipResponse clears the witness recommendation on a non-ghost answer', () => {
  // Amendment A1 review round 2: recommendSocial was a one-way latch — pick
  // 'ghost', go BACK, change to a non-ghost answer, and the stale flag left a
  // false "you go dark after a miss" note at the stakes step.
  it("ghost SETS recommendSocial", () => {
    const t = resolveNext(node('slipResponse'), { slipResponse: 'ghost' })
    expect(t.set).toEqual({ recommendSocial: true })
  })
  it('any non-ghost answer CLEARS it (defaultSet), so a re-answer un-recommends', () => {
    for (const k of ['shrug', 'spiral', 'critic']) {
      const t = resolveNext(node('slipResponse'), { slipResponse: k })
      expect(t.set).toEqual({ recommendSocial: false })
    }
  })
})

describe('longestPathFrom — the honest denominator', () => {
  it('from the entry equals longestPath', () => {
    expect(longestPathFrom(flow, flow.entryId)).toBe(longestPath(flow))
  })
  it('from the final question node is 1 (itself; the commit node never counts)', () => {
    expect(longestPathFrom(flow, 'stakePref')).toBe(1)
  })
  it('shrinks as branches resolve: theme → health → stakePref is 3', () => {
    expect(longestPathFrom(flow, 'theme')).toBe(3)
  })
  it('walked + remaining can never exceed the full deepest branch', () => {
    // The elite path (rate ≥6) skips anchorHabit: after 1 walked step the
    // remaining-deepest from `protocols` is at most longestPath - 2.
    expect(1 + longestPathFrom(flow, 'protocols')).toBeLessThanOrEqual(longestPath(flow))
  })
})
