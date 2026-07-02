import { defineConfig } from 'vitest/config'

// Unit tests for the pure logic layer (src/lib/*). Kept separate from the Vite
// app config (vite.config.js) so the PWA/service-worker plugins don't load during
// tests, and separate from Playwright — which owns the browser e2e specs in
// tests/*.spec.js. Vitest only ever sees src/**/*.test.js, so the two runners
// never collide.
export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**', 'ios/**', 'tests/**'],
    environment: 'node',
    globals: false,
  },
})
