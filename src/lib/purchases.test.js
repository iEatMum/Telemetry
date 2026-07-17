// purchases.test.js — the register's local core.
//
// Native StoreKit can only be proven on a device; what CAN be pinned here is
// the entitlement sidecar's behavior: the default locked state, corrupt-storage
// tolerance, the dev-mock purchase path (vitest runs with DEV=true, same as the
// browser walkthrough), and the free/coach split's single source of truth
// (isEntitled). A Map-backed localStorage shim stands in for the browser.
import { describe, it, expect, beforeEach } from 'vitest'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const { getEntitlement, isEntitled, purchase, restore, devClearEntitlement, PLANS } = await import(
  './purchases.js'
)

beforeEach(() => {
  store.clear()
  devClearEntitlement()
})

describe('the locked default', () => {
  it('a fresh install is not entitled', () => {
    expect(isEntitled()).toBe(false)
    expect(getEntitlement().status).toBe('none')
  })

  it('corrupt sidecar JSON degrades to locked, never a crash', async () => {
    // Route through restore(): its DEV path calls read() DIRECTLY, so the
    // corrupt value actually hits the JSON.parse try/catch (isEntitled alone
    // can serve the in-memory cache and never exercise the parse).
    store.set('lockedin:__coach', '{not json')
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('nothing-to-restore') // parsed → locked default
    expect(() => isEntitled()).not.toThrow()
  })
})

describe('plans — the M0.2 price sheet', () => {
  it('carries exactly the two ratified plans with ASC product ids', () => {
    expect(PLANS.map((p) => p.productId)).toEqual([
      'telemetry.coach.yearly',
      'telemetry.coach.monthly',
    ])
    expect(PLANS.find((p) => p.key === 'yearly').price).toBe('$39.99')
    expect(PLANS.find((p) => p.key === 'monthly').price).toBe('$6.99')
    // Annual is the pushed default (M0.2).
    expect(PLANS[0].recommended).toBe(true)
  })
})

describe('the dev register (web, DEV=true)', () => {
  it('purchase starts a mock trial and flips every gate', async () => {
    const res = await purchase('yearly')
    expect(res.ok).toBe(true)
    expect(res.mock).toBe(true)
    expect(isEntitled()).toBe(true)
    expect(getEntitlement().status).toBe('trial')
    expect(getEntitlement().source).toBe('dev-mock')
  })

  it('an unknown plan is refused without writing anything', async () => {
    const res = await purchase('lifetime')
    expect(res.ok).toBe(false)
    expect(isEntitled()).toBe(false)
  })

  it('restore with no prior purchase reports nothing-to-restore', async () => {
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('nothing-to-restore')
  })

  it('restore after a mock purchase succeeds', async () => {
    await purchase('monthly')
    const res = await restore()
    expect(res.ok).toBe(true)
  })

  it('devClearEntitlement walks back to locked so gates can be re-tested', async () => {
    await purchase('yearly')
    devClearEntitlement()
    expect(isEntitled()).toBe(false)
  })
})

describe('the lapsed contract (second panel — winback seam)', () => {
  it('devMarkLapsed flips an entitled record to expired: locked but lapsed', async () => {
    const { hasLapsed, devMarkLapsed } = await import('./purchases.js')
    await purchase('yearly')
    expect(isEntitled()).toBe(true)
    devMarkLapsed()
    expect(isEntitled()).toBe(false)
    expect(hasLapsed()).toBe(true)
    expect(getEntitlement().status).toBe('expired')
  })

  it('a fresh install has never lapsed', async () => {
    const { hasLapsed } = await import('./purchases.js')
    expect(hasLapsed()).toBe(false)
  })

  it('re-purchase after a lapse unlocks again', async () => {
    const { hasLapsed, devMarkLapsed } = await import('./purchases.js')
    await purchase('monthly')
    devMarkLapsed()
    await purchase('monthly')
    expect(isEntitled()).toBe(true)
    expect(hasLapsed()).toBe(false)
  })
})

describe('localized plans (off native)', () => {
  it('falls back to the hardcoded USD reference off-device', async () => {
    const { getLocalizedPlans } = await import('./purchases.js')
    const plans = await getLocalizedPlans()
    expect(plans).toEqual(PLANS)
  })
})
