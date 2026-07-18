import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Two build shapes (MASTERPLAN Phase 1 · store-build integrity):
//
//   `vite build`               — the WEB build (Vercel). PWA on, env from .env.local.
//   `vite build --mode store`  — the STORE build that gets wrapped by Capacitor.
//     · VITE_SUPABASE_* are force-blanked at the define layer, so no backend key
//       can ride into the App Store bundle no matter what .env.local holds
//       (v1 is local-first; sync returns in v1.1 with its own policy).
//     · Refuses to build at all if VITE_TESTER is set — the paywall pass-through
//       must be physically impossible to ship (tester device builds use the
//       default mode on purpose).
//     · The PWA plugin is dropped entirely: no service worker, no manifest in the
//       WKWebView (SHIPPING.md; SWs don't run under capacitor:// anyway, and a
//       stale precache inside the native shell is pure downside).
export default defineConfig(({ mode }) => {
  const isStore = mode === 'store'
  if (isStore) {
    const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
    if (env.VITE_TESTER) {
      throw new Error(
        'store build refused: VITE_TESTER is set. The tester paywall pass-through must never ship — unset it (tester device builds use `vite build`, not --mode store).'
      )
    }
  }

  return {
    define: isStore
      ? {
          'import.meta.env.VITE_SUPABASE_URL': '""',
          'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
          'import.meta.env.VITE_TESTER': '""',
        }
      : {},
    plugins: [
      react(),
      !isStore &&
        VitePWA({
          registerType: 'autoUpdate',
          // We own the service worker (src/sw.js) so it can receive Web Push and
          // show the Guardian's notifications on the WEB build. injectManifest
          // bundles our worker and injects the precache list into it.
          strategies: 'injectManifest',
          srcDir: 'src',
          filename: 'sw.js',
          includeAssets: ['icons/apple-touch-icon-180.png', 'sounds/sprint-end.wav'],
          injectManifest: {
            globPatterns: ['**/*.{js,css,html,png,svg,wav,woff2}'],
          },
          manifest: {
            name: 'Telemetry',
            short_name: 'Telemetry',
            description: 'Discipline, measured. Your day, streaks, and readiness — tracked in one terminal.',
            theme_color: '#06080b',
            background_color: '#06080b',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            icons: [
              { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
              {
                src: 'icons/pwa-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          devOptions: {
            enabled: false, // keep the SW out of the way during `npm run dev`
          },
        }),
    ].filter(Boolean),
  }
})
