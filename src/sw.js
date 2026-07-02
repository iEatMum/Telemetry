// sw.js — the custom service worker. (vite-plugin-pwa `injectManifest` strategy.)
//
// WHY A CUSTOM SW: the app used to let vite-plugin-pwa auto-generate the worker
// (`generateSW`). That gives precaching but NO way to add our own event
// handlers. The Guardian needs the worker to (a) receive Web Push and (b) show
// notifications — and on iOS those notifications MUST come from the service
// worker (a page-context `new Notification()` silently fails in an installed iOS
// PWA). So we own the worker now.
//
// We still precache the whole app shell, exactly like before, so Telemetry keeps
// opening with no network (offline-first is non-negotiable — Lally 2010 / AVE:
// the habit loop can never wait on the network).

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

// --- App shell precache (offline-first) ------------------------------------
cleanupOutdatedCaches()
// `self.__WB_MANIFEST` is replaced at build time with the list of files to
// precache. Required by injectManifest — do not remove.
precacheAndRoute(self.__WB_MANIFEST || [])

// SPA navigation fallback: any navigation request is served the cached app shell
// (index.html), so deep links and reloads work offline. Mirrors the old
// `navigateFallback: '/index.html'` setting.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// `registerType: 'autoUpdate'` — take control as soon as a new worker is ready,
// so the user never has to be prompted to refresh.
self.skipWaiting()
clientsClaim()

// --- The Guardian: Web Push --------------------------------------------------
// A push arrives as JSON: { title, body, tag?, url?, action?, requireInteraction? }
// (sent later by a server / Supabase Edge Function holding the VAPID private
// key). We just render it. If the payload is malformed, we still show something
// rather than dropping the Guardian's voice on the floor.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Telemetry'
  const options = {
    body: data.body || '',
    icon: '/icons/pwa-192.png',
    badge: '/icons/pwa-192.png',
    // One tag = the Guardian never stacks ten nagging notifications; a newer one
    // replaces the older. (PSYCHOLOGY.md: no escalating nags.)
    tag: data.tag || 'guardian',
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    data: { url: data.url || '/', action: data.action || null },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Tapping the notification focuses the app (or opens it), and can deep-link to a
// place in the app (e.g. straight into the urge protocol) via `data.url`.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // A push payload is untrusted. Resolve the target to a SAME-ORIGIN path so a
  // malicious `data.url` can never send the user off-origin (phishing in the
  // PWA's trusted context) or to a non-http scheme.
  const raw = (event.notification.data && event.notification.data.url) || '/'
  let url = '/'
  try {
    const resolved = new URL(raw, self.location.origin)
    if (resolved.origin === self.location.origin) url = resolved.pathname + resolved.search + resolved.hash
  } catch {
    url = '/'
  }
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if (url && url !== '/' && 'navigate' in client) {
            try {
              await client.navigate(url)
            } catch {
              /* cross-origin or not allowed — focusing is enough */
            }
          }
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url)
    })(),
  )
})

// The browser can rotate a push subscription out from under us. When it does,
// best-effort re-subscribe so the Guardian's line of communication stays open.
// (No-op until a VAPID key + server exist; harmless before then.)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const applicationServerKey = event.oldSubscription?.options?.applicationServerKey
        if (!applicationServerKey) return
        await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
        // A future step POSTs the new subscription to the server here.
      } catch {
        /* offline / not permitted — the page will re-subscribe on next open */
      }
    })(),
  )
})
