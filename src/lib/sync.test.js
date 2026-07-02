// sync.test.js — the offline-first sync engine's pure core.
//
// sync.js exposes `_internals` expressly for tests. We cover the two pieces most
// likely to silently corrupt data:
//   1. the slice <-> record-map translation (records / reassemble / diff), and
//   2. the Last-Write-Wins merge decision (mergeInto).
// These are pure over their inputs + the module's `meta` bookkeeping, so they run
// without a live Supabase or a browser (the node test env has no localStorage;
// storage.get() then returns slice defaults, which is fine for the merge logic).
import { describe, it, expect } from 'vitest'
import { _internals } from './sync.js'

const { records, diff, reassemble, mergeInto, resetMeta, getMeta } = _internals

describe('records — slice -> key/record map', () => {
  it('maps a singleton under _self', () => {
    const m = records('settings', { a: 1 })
    expect([...m.keys()]).toEqual(['_self'])
    expect(m.get('_self')).toEqual({ a: 1 })
  })

  it('keys a collection by id and drops id-less items', () => {
    const m = records('runs', [{ id: 'a' }, { id: 'b' }, { noId: 1 }])
    expect([...m.keys()]).toEqual(['a', 'b'])
  })

  it('keys a composite array by its keyField', () => {
    const m = records('sprints', [{ date: '2026-01-01', count: 1 }])
    expect([...m.keys()]).toEqual(['2026-01-01'])
  })

  it('keys a composite object by its own keys', () => {
    const m = records('checklist', { '2026-01-01': { wake: 'done' } })
    expect(m.get('2026-01-01')).toEqual({ wake: 'done' })
  })

  it('handles a null value', () => {
    expect(records('runs', null).size).toBe(0)
  })
})

describe('reassemble — round-trips records()', () => {
  it('collection', () => {
    const arr = [{ id: 'a', v: 1 }, { id: 'b' }]
    expect(reassemble('runs', records('runs', arr))).toEqual(arr)
  })
  it('composite object', () => {
    const obj = { '2026-01-01': { wake: 'done' }, '2026-01-02': { run: 'missed' } }
    expect(reassemble('checklist', records('checklist', obj))).toEqual(obj)
  })
  it('singleton', () => {
    expect(reassemble('settings', records('settings', { a: 1 }))).toEqual({ a: 1 })
  })
})

describe('diff — changed / removed detection', () => {
  it('detects an added record', () => {
    expect(diff('runs', [{ id: 'a', v: 1 }], [{ id: 'a', v: 1 }, { id: 'b' }])).toEqual({
      changed: ['b'],
      removed: [],
    })
  })
  it('detects a changed record body', () => {
    expect(diff('runs', [{ id: 'a', v: 1 }], [{ id: 'a', v: 2 }])).toEqual({ changed: ['a'], removed: [] })
  })
  it('detects a removed record', () => {
    expect(diff('runs', [{ id: 'a' }], [])).toEqual({ changed: [], removed: ['a'] })
  })
  it('reports nothing when unchanged', () => {
    expect(diff('runs', [{ id: 'a', v: 1 }], [{ id: 'a', v: 1 }])).toEqual({ changed: [], removed: [] })
  })
})

describe('mergeInto — Last-Write-Wins', () => {
  const olderRow = { id: 'r1', user_id: 'u', data: { id: 'r1', miles: 5 }, updated_at: '2026-07-01T00:00:00.000Z' }
  const newerRow = { id: 'r1', user_id: 'u', data: { id: 'r1', miles: 9 }, updated_at: '2026-07-02T00:00:00.000Z' }

  it('folds in a brand-new server row and stamps it', () => {
    resetMeta()
    const changed = mergeInto('runs', [olderRow])
    expect(changed).toBe(true)
    expect(getMeta().stamp.runs.r1).toBe(olderRow.updated_at)
  })

  it('keeps a pending local change at least as new as the server (server loses)', () => {
    resetMeta()
    const m = getMeta()
    m.stamp.runs = { r1: '2026-07-02T00:00:00.000Z' } // local edited later
    m.dirty.runs = { r1: 'put' } // and not yet pushed
    expect(mergeInto('runs', [olderRow])).toBe(false)
  })

  it('lets a strictly-newer server row win over an older synced stamp', () => {
    resetMeta()
    getMeta().stamp.runs = { r1: '2026-07-01T00:00:00.000Z' } // previously synced, older
    const changed = mergeInto('runs', [newerRow])
    expect(changed).toBe(true)
    expect(getMeta().stamp.runs.r1).toBe(newerRow.updated_at)
  })
})
