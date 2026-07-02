import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// One accent color, one purpose: a personal discipline app that works offline.
// The PWA config below is what makes it installable on the home screen.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We own the service worker now (src/sw.js) so it can receive Web Push and
      // show the Guardian's notifications. injectManifest bundles our worker and
      // injects the precache list into it. (Workbox 7 is already installed.)
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['icons/apple-touch-icon-180.png', 'sounds/sprint-end.wav'],
      injectManifest: {
        // Keep the exact precache coverage the old generateSW config had — incl.
        // the sprint-end .wav — so offline-first behaviour is unchanged.
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
  ],
})
