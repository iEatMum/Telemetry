// snapshots.test.js — the crash barrier's pure halves (image + restore), plus
// the storage quarantine/alert path it exists to back up. The Filesystem plugin
// itself is native-only; these tests pin the parts that run in JS.
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

const { snapshotImage, restoreSnapshot } = await import('./snapshots.js')
const storage = await import('./storage.js')

beforeEach(() => store.clear())

describe('snapshotImage — a raw image of the whole keyspace', () => {
  it('captures every lockedin: key verbatim, sidecars and drafts included', () => {
    store.set('lockedin:streak', '{"cleanDates":["2026-07-17"]}')
    store.set('lockedin:__survey', '{"goal":"discipline"}')
    store.set('lockedin:__guardian', '{"hist":[1,2]}')
    store.set('not-ours', 'ignored')
    const img = snapshotImage()
    expect(Object.keys(img.keys).sort()).toEqual(['lockedin:__guardian', 'lockedin:__survey', 'lockedin:streak'])
    expect(img.keys['lockedin:streak']).toBe('{"cleanDates":["2026-07-17"]}')
    expect(img.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('restoreSnapshot — the empty-boot recovery', () => {
  it('writes the image back so the gate and the book both come home', () => {
    const snap = {
      day: '2026-07-17',
      keys: { 'lockedin:streak': '{"cleanDates":["2026-07-17"]}', 'lockedin:__survey': '{"goal":"x"}' },
    }
    expect(restoreSnapshot(snap)).toBe(true)
    expect(store.get('lockedin:__survey')).toBe('{"goal":"x"}')
    expect(storage.get('streak').cleanDates).toEqual(['2026-07-17'])
  })
  it('refuses foreign keys and shapeless blobs', () => {
    expect(restoreSnapshot(null)).toBe(false)
    expect(restoreSnapshot({ keys: { 'evil:key': 'x', 'lockedin:bad': 42 } })).toBe(false)
    expect(store.has('evil:key')).toBe(false)
  })
})

describe('storage quarantine + alerts (the honesty half)', () => {
  it('an unparseable slice is quarantined, healed to default, and logged', () => {
    store.set('lockedin:streak', '{not json')
    const v = storage.get('streak')
    expect(v.cleanDates).toEqual([])
    expect(store.get('lockedin:__quarantine:streak')).toBe('{not json')
    expect(storage.storageAlerts().some((a) => a.kind === 'corrupt' && a.name === 'streak')).toBe(true)
  })
  it('a shape-corrupted slice (object→array) quarantines too', () => {
    store.set('lockedin:settings', '[1,2,3]')
    const v = storage.get('settings')
    expect(v.wakeTime).toBe('06:45')
    expect(store.get('lockedin:__quarantine:settings')).toBe('[1,2,3]')
  })
  it('wipeAll clears quarantine pages along with everything else', () => {
    store.set('lockedin:__quarantine:streak', '{junk')
    storage.wipeAll()
    expect(store.has('lockedin:__quarantine:streak')).toBe(false)
  })
})
