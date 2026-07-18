// purchases.js — the register (CONSTITUTION M0.1/M3).
//
// StoreKit 2 subscription, no accounts, no backend: Apple owns billing and the
// entitlement is mirrored into a local sidecar (`lockedin:__coach`) that the
// coach gates read synchronously. The sidecar is a CACHE of Apple's truth —
// restore()/purchase() refresh it; it is deliberately NOT in sync.js's SLICES
// and NOT exported with the book (an entitlement is not an entry).
//
// The split it enforces (M0.1): the BOOK — heat sheet, streaks, sprints, urge
// protocol, health, export — is free forever and never touches this file. The
// COACH — Guardian drift intelligence, weekly review, counsel margin notes —
// asks isEntitled() and degrades to a quiet locked card, never a broken one.
//
// Platform seam (same pattern as health.js): on native the @capgo/native-purchases
// plugin talks StoreKit 2; the import is lazy so web never loads native code.
// On web DEV the mock register grants a trial so every gate + the paywall flow
// is walkable in the browser. On web PROD purchasing reports 'ios-only'.
// NATIVE PATH NEEDS DEVICE VERIFICATION — like HealthKit, StoreKit only proves
// itself on a phone with App Store Connect products configured (Ian's step;
// product ids below must match ASC exactly).

import { useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'

const KEY = 'lockedin:__coach'

// Tester pass-through: a build made with VITE_TESTER=1 mocks the register even
// ON DEVICE, so the coach gates (Guardian, review, counsel) are walkable on a
// phone BEFORE the ASC products exist — StoreKit there could only fail. The
// flag is baked at build time and explicit: store builds never set it (web DEV
// keeps its own mock branch below, AFTER the native path, so native unit tests
// still reach StoreKit code). The paywall itself still shows — tapping a plan
// grants the mock trial instead of billing.
const TESTER = import.meta.env.VITE_TESTER === '1'

// Product ids — MUST match App Store Connect. One subscription group ("Coach"),
// two plans, both with a 7-day introductory free trial configured in ASC.
export const PLANS = [
  {
    key: 'yearly',
    productId: 'telemetry.coach.yearly',
    price: '$39.99',
    per: 'year',
    line: 'A year on the book',
    sub: '$3.33 a month, billed once',
    recommended: true,
  },
  {
    key: 'monthly',
    productId: 'telemetry.coach.monthly',
    price: '$6.99',
    per: 'month',
    line: 'Month to month',
    sub: 'Cancel anytime',
    recommended: false,
  },
]

// --- sidecar state ------------------------------------------------------------

const DEFAULT = { status: 'none', productId: null, updatedAt: null, source: null }

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? { ...DEFAULT, ...v } : { ...DEFAULT }
  } catch {
    return { ...DEFAULT }
  }
}

const listeners = new Set()
let cache = null
function snapshot() {
  if (!cache) cache = read()
  return cache
}
function write(next) {
  cache = { ...next, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* quota — the in-memory cache still serves this session */
  }
  listeners.forEach((fn) => fn())
}

/** The raw entitlement record { status: 'none'|'trial'|'active'|'expired', ... }. */
export function getEntitlement() {
  return snapshot()
}

/** True when the coach layer is unlocked (trial counts — Apple runs the clock). */
export function isEntitled(e = snapshot()) {
  return e.status === 'trial' || e.status === 'active'
}

/**
 * True when the coach was hired before and the contract has since lapsed —
 * the paywall reads this to show the winback page instead of the first-hire
 * pitch. 'expired' is written by the native entitlement refresh (device
 * verification step) or the DEV helper below; it is never inferred locally,
 * because Apple owns the clock.
 */
export function hasLapsed(e = snapshot()) {
  return e.status === 'expired'
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Live entitlement for components: const { entitled } = useEntitlement(). */
export function useEntitlement() {
  const e = useSyncExternalStore(subscribe, snapshot, snapshot)
  return { entitlement: e, entitled: isEntitled(e) }
}

// --- the register (purchase / restore) ----------------------------------------

async function nativePlugin() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const mod = await import('@capgo/native-purchases')
    return mod.NativePurchases || null
  } catch {
    return null
  }
}

/**
 * Buy a plan ('yearly' | 'monthly'). Returns { ok, reason? }.
 * Native: StoreKit 2 purchase via the plugin; Apple shows the trial + price
 * sheet and runs the billing clock — we only mirror the outcome.
 * Web DEV: the mock register starts a trial so the flow is testable.
 * Web PROD: honest refusal — the register only opens in the iOS app.
 */
export async function purchase(planKey) {
  const plan = PLANS.find((p) => p.key === planKey)
  if (!plan) return { ok: false, reason: 'unknown-plan' }

  // Tester builds mock BEFORE the native path — on a device without ASC
  // products, StoreKit can only fail, and the whole point of the flag is
  // walking the gated surfaces anyway.
  if (TESTER) {
    write({ status: 'trial', productId: plan.productId, source: 'dev-mock' })
    return { ok: true, mock: true }
  }

  const native = await nativePlugin()
  if (native) {
    try {
      await native.purchaseProduct({
        productIdentifier: plan.productId,
        productType: 'subs', // PURCHASE_TYPE.SUBS; iOS ignores it, Android needs it
      })
      // Read back whether Apple placed this account in the intro (trial) period
      // so the sidecar carries 'trial' vs 'active' honestly (the trial-ending
      // nudge depends on the distinction). On any hiccup we still KNOW the buy
      // succeeded, so default to 'active' — never lock out a fresh purchaser.
      const own = await readOwnership(native)
      const isTrial = own.checked && own.productId === plan.productId && own.isTrial
      write({ status: isTrial ? 'trial' : 'active', productId: plan.productId, source: 'storekit' })
      return { ok: true }
    } catch (e) {
      // User-cancelled and failed both land here; nothing is written.
      return { ok: false, reason: e?.message || 'purchase-failed' }
    }
  }

  if (import.meta.env.DEV) {
    write({ status: 'trial', productId: plan.productId, source: 'dev-mock' })
    return { ok: true, mock: true }
  }
  return { ok: false, reason: 'ios-only' }
}

// --- ownership (StoreKit truth) ----------------------------------------------

const COACH_IDS = new Set(PLANS.map((p) => p.productId))

// Is this transaction in the free trial (or a discounted intro period)? Both
// mean "not a full paid period yet", so we carry it as 'trial'. Field names
// verified against @capgo/native-purchases 8.6.4 Transaction (definitions.d.ts):
// `isTrialPeriod` = free trial, `isInIntroPricePeriod` = discounted intro rate.
// A false negative just labels a trial 'active' (still gated correctly); it
// never over-grants.
function txIsTrial(t) {
  if (!t) return false
  if (t.isTrialPeriod || t.isInIntroPricePeriod) return true
  // REALITY CHECK (P1, tournament-verified): the installed iOS implementation
  // (TransactionHelpers.swift) never writes either field above — on device they
  // are always undefined, so trial detection was structurally dead and every
  // trial subscriber read 'active'. Derive it from data iOS DOES send: both
  // coach plans carry a 7-day intro trial in ASC, so a subscriber's first 7
  // days of ownership ARE that trial. originalPurchaseDate marks first
  // ownership — a lapsed-and-returned subscriber keeps an old original date
  // and correctly reads paid. A false positive only mislabels the status text;
  // the gates are identical either way.
  const first = Date.parse(t.originalPurchaseDate || t.purchaseDate || '')
  return Number.isFinite(first) && Date.now() - first < 7 * 24 * 3600 * 1000
}

/**
 * Read what the signed-in Apple ID GENUINELY owns right now.
 *   { checked: false }                    — couldn't ask (no plugin / threw)
 *   { checked: true, productId: null }    — asked, owns no active coach
 *   { checked: true, productId, isTrial } — owns this coach product now
 * The checked/!checked split is load-bearing: a transient failure must NEVER be
 * read as "owns nothing", or a paying subscriber tapping Restore gets revoked.
 * `onlyCurrentEntitlements: true` scopes to this Apple ID + still-active grants,
 * so a coach can't leak from another account on a shared/refurbished device.
 */
async function readOwnership(native) {
  if (!native || typeof native.getPurchases !== 'function') return { checked: false }
  try {
    const res = await native.getPurchases({ onlyCurrentEntitlements: true })
    const purchases = Array.isArray(res?.purchases) ? res.purchases : []
    const now = Date.now()
    const match = purchases.find((t) => {
      if (!t || !COACH_IDS.has(t.productIdentifier)) return false
      // Refunded / revoked keeps a future expirationDate but must NOT grant.
      if (t.revocationDate) return false
      if (t.subscriptionState === 'expired' || t.subscriptionState === 'revoked') return false
      // BILLING GRACE (P1): a renewal that failed but Apple says keep serving.
      // The installed plugin computes isActive purely as expirationDate>now, so
      // a grace-period subscriber fails BOTH checks below while still paying —
      // they were getting locked out and shown the winback page. Apple's truth
      // rides in subscriptionState; honor it before the date math.
      if (t.subscriptionState === 'inGracePeriod' || t.subscriptionState === 'inBillingRetryPeriod') return true
      if (t.isActive === false) return false
      if (t.expirationDate) {
        const exp = Date.parse(t.expirationDate)
        if (Number.isFinite(exp) && exp <= now) return false
      }
      return true
    })
    if (!match) return { checked: true, productId: null }
    return { checked: true, productId: match.productIdentifier, isTrial: txIsTrial(match) }
  } catch {
    return { checked: false }
  }
}

// Write the entitlement a CHECKED ownership read implies, relative to the prior
// sidecar. Apple owning nothing when we previously held the coach is a LAPSE
// (→ 'expired', which locks the coach and lights the winback), not a never-owned
// 'none'. Skips the write (and its listener churn) when nothing actually changed
// — this runs on every launch. Only call with own.checked === true.
function applyOwnership(own, prev, source) {
  const status = own.productId
    ? own.isTrial
      ? 'trial'
      : 'active'
    : prev && (prev.status === 'active' || prev.status === 'trial' || prev.status === 'expired')
      ? 'expired'
      : 'none'
  const productId = own.productId || (status === 'expired' ? (prev && prev.productId) || null : null)
  const changed = !prev || prev.status !== status || (prev.productId || null) !== productId
  if (changed) write({ ...DEFAULT, status, productId, source })
  if (status === 'active' || status === 'trial') return { ok: true }
  return { ok: false, reason: status === 'expired' ? 'lapsed' : 'nothing-to-restore' }
}

/** Re-mirror Apple's entitlement (new device, reinstall, family sharing). */
export async function restore() {
  if (TESTER) {
    const e = read()
    return isEntitled(e) ? { ok: true, mock: true } : { ok: false, reason: 'nothing-to-restore' }
  }
  const native = await nativePlugin()
  if (native) {
    try {
      const prev = read()
      await native.restorePurchases()
      // restorePurchases() resolving does NOT mean anything is owned — it only
      // runs the platform sync. Verify actual ownership before granting; a
      // never-purchaser who taps Restore must land back on the locked state,
      // not walk away with a free coach (App Store 3.1.1 + our own register).
      const own = await readOwnership(native)
      if (!own.checked) {
        // Couldn't verify (network / StoreKit hiccup). Do NOT touch the sidecar:
        // silently revoking a real subscriber on a transient error is worse than
        // a "try again". Leave whatever entitlement was already cached intact.
        return { ok: false, reason: 'verify-failed' }
      }
      return applyOwnership(own, prev, 'storekit-restore')
    } catch (e) {
      return { ok: false, reason: e?.message || 'restore-failed' }
    }
  }
  if (import.meta.env.DEV) {
    const e = read()
    return isEntitled(e) ? { ok: true, mock: true } : { ok: false, reason: 'nothing-to-restore' }
  }
  return { ok: false, reason: 'ios-only' }
}

/**
 * Silent launch/resume refresh — re-mirror Apple's CURRENT entitlement without
 * the user-facing restore sync. This is what keeps the sidecar honest over time:
 * a cancelled or expired subscription flips to 'expired' (locking the coach and
 * lighting the winback), and an intro-period sub reads 'trial'. Fail-soft: a
 * transient read failure leaves the cache untouched — the cache is never revoked
 * on a hiccup. Native-only; a harmless no-op on web.
 * NEEDS DEVICE VERIFICATION — the StoreKit transaction shape (trial flag,
 * expiration) only proves out on a phone with ASC products configured.
 */
export async function refreshEntitlement() {
  // Tester builds: the mock register owns the clock. Without this guard the
  // launch refresh reads Apple's honest "owns nothing" and expires the mock
  // trial every boot — the exact gate-walking the flag exists to allow.
  if (TESTER) return getEntitlement()
  const native = await nativePlugin()
  if (!native) return getEntitlement()
  const prev = read()
  const own = await readOwnership(native)
  if (!own.checked) return prev // transient — keep the cache, don't revoke
  applyOwnership(own, prev, 'storekit-refresh')
  return getEntitlement()
}

/**
 * Localized plan display. On native, asks StoreKit for the real products and
 * returns PLANS with the storefront's own price strings (a Berlin phone shows
 * €, not a hardcoded $). Off native — or on any plugin hiccup — it returns
 * PLANS untouched, so the paywall always has something honest to print.
 */
export async function getLocalizedPlans() {
  const native = await nativePlugin()
  if (!native || typeof native.getProducts !== 'function') return PLANS
  try {
    const res = await native.getProducts({ productIdentifiers: PLANS.map((p) => p.productId) })
    const products = Array.isArray(res?.products) ? res.products : []
    // Product fields per @capgo/native-purchases 8.6.4: identifier, priceString
    // (formatted, e.g. "€3.99"), price (number), currencyCode.
    const byId = new Map(products.map((p) => [p.identifier, p]))
    return PLANS.map((plan) => {
      const p = byId.get(plan.productId)
      const priceString = p && p.priceString
      if (!priceString) return plan
      const out = { ...plan, price: priceString }
      // The yearly card's "$3.33 a month" anchor only survives localization when
      // the plugin gives us a numeric price + currency to divide honestly.
      if (plan.key === 'yearly') {
        const amount = Number(p.price)
        const currency = p.currencyCode
        if (Number.isFinite(amount) && amount > 0 && currency) {
          try {
            const perMonth = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 12)
            out.sub = `${perMonth} a month, billed once`
          } catch {
            out.sub = 'billed once a year'
          }
        } else {
          out.sub = 'billed once a year'
        }
      }
      return out
    })
  } catch {
    return PLANS
  }
}

/** DEV helper — drop the in-memory cache so the next read re-hydrates from storage. */
export function devReloadCache() {
  if (!import.meta.env.DEV) return
  cache = null
}

/** DEV helper — walk back to the locked state to test the gates. */
export function devClearEntitlement() {
  if (!import.meta.env.DEV) return
  write({ ...DEFAULT })
}

/** DEV helper — simulate an expired subscription to walk the winback page. */
export function devMarkLapsed() {
  if (!import.meta.env.DEV) return
  const e = read()
  write({ ...e, status: 'expired' })
}
