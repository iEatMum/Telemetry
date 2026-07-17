// purchases.native.test.js — the native register path, which the plain
// purchases.test.js CANNOT reach (Capacitor.isNativePlatform() is false under
// node, so those tests only ever hit the DEV branch). Round-2 review found the
// native restore() granted a paid entitlement to anyone who tapped "Restore
// Purchases" — StoreKit's restorePurchases() resolves even when nothing is
// owned. These tests mock the plugin to pin the ownership check.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const plugin = { restorePurchases: vi.fn(), getPurchases: vi.fn(), purchaseProduct: vi.fn() }
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capgo/native-purchases', () => ({ NativePurchases: plugin }))

const { restore, refreshEntitlement, isEntitled, getEntitlement, devReloadCache } = await import('./purchases.js')

beforeEach(() => {
  store.clear()
  // Drop the module's in-memory entitlement cache so each test hydrates from the
  // (freshly cleared) store — otherwise a prior test's write leaks into a case
  // that deliberately performs no write (the no-revoke / never-purchaser paths).
  devReloadCache()
  plugin.restorePurchases.mockReset().mockResolvedValue(undefined)
  plugin.getPurchases.mockReset()
})

describe('native restore() verifies ownership before granting (A1 review round 2)', () => {
  it('a never-purchaser who taps Restore stays LOCKED — no free coach', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [] })
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('nothing-to-restore')
    expect(isEntitled()).toBe(false)
  })

  it('grants active only when a coach subscription is genuinely owned', async () => {
    plugin.getPurchases.mockResolvedValue({
      purchases: [{ productIdentifier: 'telemetry.coach.yearly', isActive: true }],
    })
    const res = await restore()
    expect(res.ok).toBe(true)
    expect(isEntitled()).toBe(true)
    expect(getEntitlement().productId).toBe('telemetry.coach.yearly')
  })

  it('ignores a foreign IAP and an expired coach transaction — never over-grants', async () => {
    plugin.getPurchases.mockResolvedValue({
      purchases: [
        { productIdentifier: 'some.other.iap', isActive: true },
        { productIdentifier: 'telemetry.coach.monthly', isActive: true, expirationDate: '2000-01-01T00:00:00Z' },
      ],
    })
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(isEntitled()).toBe(false)
  })

  it('corrects a stale "active" sidecar to expired (lapsed) when Apple reports nothing', async () => {
    store.set('lockedin:__coach', JSON.stringify({ status: 'active', productId: 'telemetry.coach.yearly' }))
    plugin.getPurchases.mockResolvedValue({ purchases: [] })
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('lapsed')
    expect(isEntitled()).toBe(false)
    expect(getEntitlement().status).toBe('expired') // lights the winback, not a bare 'none'
  })

  it('refuses (never grants) if the plugin cannot answer ownership', async () => {
    plugin.getPurchases.mockRejectedValue(new Error('storekit unavailable'))
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('verify-failed')
    expect(isEntitled()).toBe(false)
  })

  it('does NOT revoke a real subscriber when the ownership check throws (transient)', async () => {
    store.set('lockedin:__coach', JSON.stringify({ status: 'active', productId: 'telemetry.coach.yearly' }))
    plugin.getPurchases.mockRejectedValue(new Error('offline'))
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('verify-failed')
    expect(isEntitled()).toBe(true) // a paying customer is never locked out on a hiccup
  })
})

describe('refreshEntitlement re-mirrors Apple on launch/resume (A1 review round 3)', () => {
  it('flips a stale "active" sidecar to expired when Apple owns nothing (cancelled sub locks the coach)', async () => {
    store.set('lockedin:__coach', JSON.stringify({ status: 'active', productId: 'telemetry.coach.yearly' }))
    plugin.getPurchases.mockResolvedValue({ purchases: [] })
    await refreshEntitlement()
    expect(getEntitlement().status).toBe('expired')
    expect(isEntitled()).toBe(false)
  })

  it('keeps the cache intact on a transient read failure (never revoke on a hiccup)', async () => {
    store.set('lockedin:__coach', JSON.stringify({ status: 'active', productId: 'telemetry.coach.yearly' }))
    plugin.getPurchases.mockRejectedValue(new Error('offline'))
    await refreshEntitlement()
    expect(isEntitled()).toBe(true)
  })

  it('reads a trial-period transaction as trial, not a full purchase', async () => {
    plugin.getPurchases.mockResolvedValue({
      // isTrialPeriod is the real @capgo/native-purchases 8.6.4 field.
      purchases: [{ productIdentifier: 'telemetry.coach.monthly', isActive: true, isTrialPeriod: true }],
    })
    await refreshEntitlement()
    expect(getEntitlement().status).toBe('trial')
    expect(isEntitled()).toBe(true)
  })

  it('does not grant on a refunded/revoked coach transaction (isActive can lag revocation)', async () => {
    plugin.getPurchases.mockResolvedValue({
      purchases: [
        {
          productIdentifier: 'telemetry.coach.yearly',
          isActive: true, // StoreKit's isActive only checks expiry, not revocation
          revocationDate: '2026-07-01T00:00:00Z',
          subscriptionState: 'revoked',
        },
      ],
    })
    const res = await restore()
    expect(res.ok).toBe(false)
    expect(isEntitled()).toBe(false)
  })

  it('stays "none" for a never-purchaser (no spurious winback)', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [] })
    await refreshEntitlement()
    expect(getEntitlement().status).toBe('none')
    expect(isEntitled()).toBe(false)
  })
})
