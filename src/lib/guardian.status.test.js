// guardian.status.test.js — the diagnostic self-check + the 30-min pre-window
// notification timing.
import { describe, it, expect, beforeAll } from 'vitest'
import { assessDrift, verifyGuardianStatus } from './guardianEngine.js'

// The unit env is `node` (no localStorage); the sidecar read/write path needs
// one for verifyGuardianStatus to observe its own heartbeat. Map-backed shim.
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const m = new Map()
    globalThis.localStorage = {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      clear: () => m.clear(),
    }
  }
})

describe('pre-window notification fires EXACTLY 30 min before the vulnerability hour', () => {
  it('peakHour 23:00 → warnAt 22:30 (when now is earlier)', () => {
    const now = new Date(2026, 5, 25, 20, 0, 0)
    const a = assessDrift({ now, streak: {}, guardianSeed: { temporalPrior: { peakHour: 23.0 } } })
    expect(a.window).not.toBeNull()
    expect(a.window.warnAt.getHours()).toBe(22)
    expect(a.window.warnAt.getMinutes()).toBe(30)
    // exactly 30 minutes before the peak
    const gap = a.window.peakHour * 60 - (a.window.warnAt.getHours() * 60 + a.window.warnAt.getMinutes())
    expect(gap).toBe(30)
  })
  it('a fractional peak (14:20) still warns 30 min prior (13:50)', () => {
    const now = new Date(2026, 5, 25, 10, 0, 0)
    const a = assessDrift({ now, streak: {}, guardianSeed: { temporalPrior: { peakHour: 14 + 20 / 60 } } })
    expect(a.window.warnAt.getHours()).toBe(13)
    expect(a.window.warnAt.getMinutes()).toBe(50)
  })
  it('peakHour 0 (midnight) wraps to 23:30 — never yesterday, never silent', () => {
    // The old math computed setHours(-1, 30) = YESTERDAY 23:30 → warnAt<now →
    // null: the warning could never fire for the midnight-area windows this
    // app's late-night users actually have.
    const now = new Date(2026, 5, 25, 20, 0, 0)
    const a = assessDrift({ now, streak: {}, guardianSeed: { temporalPrior: { peakHour: 0 } } })
    expect(a.window.warnAt).not.toBeNull()
    expect(a.window.warnAt.getHours()).toBe(23)
    expect(a.window.warnAt.getMinutes()).toBe(30)
    expect(a.window.warnAt > now).toBe(true) // tonight, not last night
  })
  it('a warn time already past today arms TOMORROW instead of going silent', () => {
    const now = new Date(2026, 5, 25, 23, 0, 0) // 23:00 — past a 22:30 warn
    const a = assessDrift({ now, streak: {}, guardianSeed: { temporalPrior: { peakHour: 23.0 } } })
    expect(a.window.warnAt).not.toBeNull()
    expect(a.window.warnAt > now).toBe(true)
    expect(a.window.warnAt.getDate()).toBe(26) // rolled to the 26th
    expect(a.window.warnAt.getHours()).toBe(22)
    expect(a.window.warnAt.getMinutes()).toBe(30)
  })
})

describe('verifyGuardianStatus — the loop self-check', () => {
  it('probing runs the loop → store round-trips, listener bound, loop recent → ok', async () => {
    const status = await verifyGuardianStatus() // probe: true
    expect(status.ok).toBe(true)
    expect(status.checks.storeReadable).toBe(true)
    expect(status.checks.loopRecent).toBe(true)
    expect(status.checks.listenerBound).toBe(true)
    expect(status.checkedAt).toBeTruthy()
  })

  it('a cold store with no probe → loop not recent → not ok (honest failure)', async () => {
    localStorage.clear()
    const status = await verifyGuardianStatus({ probe: false })
    expect(status.checks.loopRecent).toBe(false)
    expect(status.ok).toBe(false)
  })
})
