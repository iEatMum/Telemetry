// health.test.js — the Apple Health / Health Connect bridge.
//
// We test the fail-soft contract (web/simulator/missing-plugin → null, never
// throws) and the pure toReadinessInputs mapping. In Vitest's jsdom-less node
// env @capacitor/core's Capacitor.isNativePlatform() is false, so loadKit()
// short-circuits to null — exactly the web/simulator path — letting us assert
// the no-op behavior without mocking any native module (matches house style).

import { describe, it, expect } from 'vitest'
import { isHealthAvailable, requestHealthAuth, readToday, toReadinessInputs } from './health.js'

describe('isHealthAvailable', () => {
  it('resolves false off-native (no plugin/SDK) instead of throwing', async () => {
    await expect(isHealthAvailable()).resolves.toBe(false)
  })
})

describe('requestHealthAuth', () => {
  it('reports unavailable off-native without throwing', async () => {
    const res = await requestHealthAuth()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('unavailable')
  })
})

describe('readToday', () => {
  it('returns null off-native (web/simulator/missing plugin)', async () => {
    await expect(readToday()).resolves.toBeNull()
  })
})

describe('toReadinessInputs', () => {
  it('returns null for a falsy snapshot (so a null readToday no-ops)', () => {
    expect(toReadinessInputs(null)).toBeNull()
    expect(toReadinessInputs(undefined)).toBeNull()
  })

  it('leaves sleep undefined when sleepHours is missing', () => {
    const out = toReadinessInputs({ sleepHours: null, restingHR: 52 })
    expect(out.sleep).toBeUndefined()
    expect(out.rhr).toBe(52)
  })

  it('maps sleep hours onto the 1-5 band at each threshold', () => {
    expect(toReadinessInputs({ sleepHours: 8 }).sleep).toBe(5)
    expect(toReadinessInputs({ sleepHours: 7 }).sleep).toBe(4)
    expect(toReadinessInputs({ sleepHours: 6 }).sleep).toBe(3)
    expect(toReadinessInputs({ sleepHours: 5 }).sleep).toBe(2)
    expect(toReadinessInputs({ sleepHours: 4.5 }).sleep).toBe(1)
  })

  it('treats an explicit 0 hours as a real poor reading (band 1), not missing', () => {
    expect(toReadinessInputs({ sleepHours: 0 }).sleep).toBe(1)
  })

  it('maps restingHR straight through and uses undefined when absent', () => {
    expect(toReadinessInputs({ sleepHours: 7, restingHR: 48 }).rhr).toBe(48)
    expect(toReadinessInputs({ sleepHours: 7 }).rhr).toBeUndefined()
    expect(toReadinessInputs({ sleepHours: 7, restingHR: null }).rhr).toBeUndefined()
  })
})
