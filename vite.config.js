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
      includeAssets: ['icons/apple-touch-icon-180.png', 'sounds/sprint-end.wav'],
      manifest: {
        name: 'LOCKED IN',
        short_name: 'LOCKED IN',
        description: 'Personal daily discipline. Verse, streak, sprints — built for one.',
        theme_color: '#0A0B0D',
        background_color: '#0A0B0D',
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
      workbox: {
        // Offline-first: precache the app shell so it opens with no network.
        globPatterns: ['**/*.{js,css,html,png,svg,wav,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false, // keep the SW out of the way during `npm run dev`
      },
    }),
  ],
})
