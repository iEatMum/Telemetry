// notifications.test.js — first coverage for the local-notification engine's
// pure halves: which layout blocks become notifications, id stability, and the
// reschedule signature. (The schedule/cancel calls themselves are native-only
// and covered by DEVICE_VERIFICATION.md.)
import { describe, it, expect } from 'vitest'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const { notificationsFromLayout, layoutScheduleKey } = await import('./notifications.js')

const layout = (blocks) => ({ tabs: [{ key: 'today', blocks }] })

describe('notificationsFromLayout', () => {
  it('emits one entry per timed ScheduleMatrix row + a timed DeepWorkTimer', () => {
    const out = notificationsFromLayout(
      layout([
        {
          id: 'live-sched',
          type: 'ScheduleMatrix',
          config: {
            rows: [
              { time: '05:30', block: 'Wake — feet on floor' },
              { time: '', block: 'Untimed — never scheduled' },
              { time: '22:15', block: 'Phone out of the room' },
            ],
          },
        },
        { id: 'live-deepwork', type: 'DeepWorkTimer', config: { label: 'Deep work', minutes: 50, at: '09:00' } },
        { id: 'live-kpis', type: 'KpiGrid', config: {} },
      ])
    )
    expect(out).toHaveLength(3)
    expect(out.map((n) => `${n.hour}:${n.minute}`).sort()).toEqual(['22:15', '5:30', '9:0'])
    expect(out.find((n) => n.title.includes('Deep Work')).body).toBe('Deep work — 50m')
  })
  it('rejects malformed times and duplicate ids', () => {
    const out = notificationsFromLayout(
      layout([
        {
          id: 'live-sched',
          type: 'ScheduleMatrix',
          config: { rows: [{ time: '25:99', block: 'bad' }, { time: 'noon', block: 'worse' }] },
        },
        // A DeepWorkTimer whose `minutes` is a duration, not a start — no `at`,
        // so it must NOT schedule.
        { id: 'live-deepwork', type: 'DeepWorkTimer', config: { label: 'Deep work', minutes: 50 } },
      ])
    )
    expect(out).toHaveLength(0)
  })
  it('ids are stable across calls (reschedule replaces, never stacks)', () => {
    const l = layout([
      { id: 'live-sched', type: 'ScheduleMatrix', config: { rows: [{ time: '05:30', block: 'Wake' }] } },
    ])
    expect(notificationsFromLayout(l)[0].id).toBe(notificationsFromLayout(l)[0].id)
    expect(notificationsFromLayout(l)[0].id).toBeGreaterThan(0)
  })
})

describe('layoutScheduleKey — the effect dep', () => {
  const base = layout([
    { id: 'live-sched', type: 'ScheduleMatrix', config: { rows: [{ time: '05:30', block: 'Wake' }] } },
  ])
  it('same times → same key; a moved block → new key', () => {
    const moved = layout([
      { id: 'live-sched', type: 'ScheduleMatrix', config: { rows: [{ time: '06:00', block: 'Wake' }] } },
    ])
    expect(layoutScheduleKey(base)).toBe(layoutScheduleKey(structuredClone(base)))
    expect(layoutScheduleKey(base)).not.toBe(layoutScheduleKey(moved))
  })
  it('an empty/blockless layout keys to the empty string', () => {
    expect(layoutScheduleKey({ tabs: [] })).toBe('')
    expect(layoutScheduleKey(null)).toBe('')
  })
})
