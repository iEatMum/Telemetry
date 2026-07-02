// push.js — Web Push + notification plumbing for the Guardian.
//
// Two jobs:
//   1. Show a notification NOW, locally, with no server (the Manual Guardian
//      Alert — to feel the voice and tone). Routed through the service worker
//      because that is the ONLY path that works in an installed iOS PWA.
//   2. Scaffold a real Web Push subscription, dormant until a VAPID key + a
//      sending server exist. Everything no-ops cleanly when unconfigured, so the
//      app never breaks on a missing key (same fail-soft rule as Supabase).
//
// Honest platform note: on iOS, notifications work ONLY after the app is added to
// the Home Screen (iOS 16.4+). `notificationStatus()` surfaces that so the UI can
// tell the truth instead of failing silently.

import { isIOS } from './browser.js'
import { supabase } from './supabaseClient.js'

export function pushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

// Installed to the Home Screen (standalone display mode)?
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  )
}

export function notificationPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

// A snapshot the UI can speak to honestly about what will and won't work here.
export function notificationStatus() {
  const ios = isIOS()
  const standalone = isStandalone()
  return {
    supported: pushSupported(),
    permission: notificationPermission(),
    ios,
    standalone,
    // iOS delivers notifications only to a Home-Screen-installed PWA.
    needsInstall: ios && !standalone,
  }
}

async function readyRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

// Show a notification NOW through the service worker. No server, no VAPID — this
// is the Manual Guardian Alert. Works in an installed iOS PWA, where a
// page-context `new Notification()` does not.
export async function showLocalNotification(title, options = {}) {
  if (notificationPermission() !== 'granted') return { ok: false, reason: 'permission' }
  const reg = await readyRegistration()
  if (!reg) return { ok: false, reason: 'no-sw' }
  try {
    await reg.showNotification(title, {
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      tag: 'guardian',
      renotify: true,
      ...options,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'show-failed', error }
  }
}

// --- Real Web Push subscription (scaffolded; dormant until a VAPID key exists) -
const VAPID_PUBLIC_KEY = (import.meta.env ?? {}).VITE_VAPID_PUBLIC_KEY

export function pushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY)
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// Subscribe this device to Web Push. Returns the subscription (which a future
// step POSTs to the server holding the VAPID private key — e.g. a Supabase Edge
// Function). No-ops cleanly when unconfigured / unsupported / not yet permitted.
export async function subscribeToPush() {
  if (!pushConfigured()) return { ok: false, reason: 'no-vapid-key' }
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  const perm = await requestNotificationPermission()
  if (perm !== 'granted') return { ok: false, reason: 'permission' }
  const reg = await readyRegistration()
  if (!reg) return { ok: false, reason: 'no-sw' }
  try {
    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))
    return { ok: true, subscription: sub.toJSON() }
  } catch (error) {
    return { ok: false, reason: 'subscribe-failed', error }
  }
}

// Persist this device's subscription so the Referee can reach it. `user_id`
// defaults to auth.uid() server-side, so we don't pass it. Upsert on endpoint
// (re-subscribing the same device just refreshes the keys).
async function storeSubscription(subJSON) {
  if (!supabase) return { ok: false, reason: 'no-supabase' }
  const endpoint = subJSON?.endpoint
  const p256dh = subJSON?.keys?.p256dh
  const auth = subJSON?.keys?.auth
  if (!endpoint || !p256dh || !auth) return { ok: false, reason: 'bad-subscription' }
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh, auth }, { onConflict: 'user_id,endpoint' })
  return error ? { ok: false, reason: 'store-failed', error } : { ok: true }
}

// One call to turn the Guardian's Pulse on for this device: request permission →
// subscribe to push → store the subscription server-side. Returns a reason on
// failure so the UI can speak to it honestly (needs-install, no-vapid, etc.).
export async function enableGuardianAlerts() {
  if (!pushConfigured()) return { ok: false, reason: 'no-vapid-key' }
  const sub = await subscribeToPush()
  if (!sub.ok) return sub
  const stored = await storeSubscription(sub.subscription)
  return stored.ok ? { ok: true } : stored
}
