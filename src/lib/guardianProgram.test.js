// guardianProgram.test.js — Phase 3 rails: the consent gate every AI call
// walks through, lock-screen privacy defaults, and the shield's window
// defaults. Small pins on the pieces that must not regress silently.
import { describe, it, expect, beforeEach } from 'vitest'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const { aiConsentGranted } = await import('./aiConsent.js')
const { privateReminders, notifPermission } = await import('./notifications.js')
const { windowDefaults } = await import('./lockdown.js')

beforeEach(() => store.clear())

describe('aiConsentGranted — deny by default', () => {
  it('no survey → no consent', () => {
    expect(aiConsentGranted()).toBe(false)
  })
  it('explicit consent.aiProcessing true → granted', () => {
    store.set('lockedin:__survey', JSON.stringify({ consent: { aiProcessing: true } }))
    expect(aiConsentGranted()).toBe(true)
  })
  it('garbage sidecar → still denied, never throws', () => {
    store.set('lockedin:__survey', '{nope')
    expect(aiConsentGranted()).toBe(false)
  })
})

describe('privateReminders — the lock screen never tells a story by default for recovery', () => {
  it('plain settings → full text allowed', () => {
    expect(privateReminders()).toBe(false)
  })
  it('recovery module on → private by default', () => {
    store.set('lockedin:settings', JSON.stringify({ modules: { recovery: true } }))
    expect(privateReminders()).toBe(true)
  })
  it('the explicit toggle beats the module default in both directions', () => {
    store.set('lockedin:settings', JSON.stringify({ modules: { recovery: true }, notifPrivacy: false }))
    expect(privateReminders()).toBe(false)
    store.set('lockedin:settings', JSON.stringify({ modules: {}, notifPrivacy: true }))
    expect(privateReminders()).toBe(true)
  })
})

describe('platform seams stay honest off-device', () => {
  it('notifPermission reports web (never a fake grant)', async () => {
    expect(await notifPermission()).toBe('web')
  })
})

describe('windowDefaults — the survey answer seeds a sane editable window', () => {
  it('late-night → 22:00–02:00 (the default demographic window)', () => {
    expect(windowDefaults('late-night')).toEqual({ start: '22:00', end: '02:00' })
  })
  it('post-wake keys off the wake time', () => {
    expect(windowDefaults('post-wake', '05:30')).toEqual({ start: '05:00', end: '07:00' })
  })
  it('unknown input falls back to late-night', () => {
    expect(windowDefaults(undefined)).toEqual({ start: '22:00', end: '02:00' })
  })
})
