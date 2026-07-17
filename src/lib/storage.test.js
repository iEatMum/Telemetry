// storage.test.js — the one localStorage choke point, pinned where the
// functionality tournament found silent-loss paths. First coverage for
// export/import round-trips; the import-preserves-drafts case is the P0 fix
// (a backup's handover always carries drafts:[] by privacy design, and the old
// import wrote that emptied slice over the live device's drafts).
import { describe, it, expect, beforeEach } from 'vitest'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i],
  get length() {
    return store.size
  },
}

const storage = await import('./storage.js')

beforeEach(() => store.clear())

describe('export → import round-trip', () => {
  it('model slices survive the round trip', () => {
    storage.set('sprints', [{ date: '2026-07-16', count: 3, labels: ['deep work'] }])
    const blob = storage.exportAll()
    store.clear()
    expect(storage.importAll(blob)).toBe(true)
    expect(storage.get('sprints')).toEqual([{ date: '2026-07-16', count: 3, labels: ['deep work'] }])
  })
  it('export strips private handover drafts (portable backups never carry them)', () => {
    storage.update('handover', (h) => ({ ...h, drafts: [{ id: 'd1', kind: 'urge', body: 'private words' }] }))
    expect(storage.exportAll().data.handover.drafts).toEqual([])
  })
  it('IMPORT preserves the live device drafts instead of deleting them (P0 fix)', () => {
    storage.update('handover', (h) => ({
      ...h,
      drafts: [{ id: 'd1', kind: 'urge', body: 'a confession that must survive' }],
      considerations: [{ id: 'c-old', heading: 'old', text: 'pre-backup' }],
    }))
    const blob = storage.exportAll() // drafts stripped by design
    blob.data.handover.considerations = [{ id: 'c-new', heading: 'new', text: 'from backup' }]
    storage.importAll(blob)
    const h = storage.get('handover')
    expect(h.drafts).toHaveLength(1) // the old import left this []
    expect(h.drafts[0].body).toBe('a confession that must survive')
    expect(h.considerations[0].id).toBe('c-new') // rest of the slice still replaced
  })
  it('importAll rejects a shapeless blob', () => {
    expect(storage.importAll(null)).toBe(false)
    expect(storage.importAll({})).toBe(false)
  })
})

describe('wipeAll', () => {
  it('clears every lockedin: key except the Apple-owned entitlement', () => {
    storage.set('streak', { ...storage.DEFAULTS.streak, cleanDates: ['2026-07-16'] })
    store.set('lockedin:__guardian', '{"x":1}')
    store.set('lockedin:__coach', '{"status":"active"}')
    storage.wipeAll()
    expect(store.has('lockedin:streak')).toBe(false)
    expect(store.has('lockedin:__guardian')).toBe(false)
    expect(store.get('lockedin:__coach')).toBe('{"status":"active"}')
  })
})
