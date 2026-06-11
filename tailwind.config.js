/** @type {import('tailwindcss').Config} */
// Colors are wired to CSS variables (see src/index.css). That's how the app
// stays dark by default but flips to a light palette when the system asks —
// one source of truth, no `dark:` prefixes scattered everywhere.
export default {
  // `relative: true` resolves these globs from THIS config file's folder, not
  // the process's working directory — which matters here because the dev server
  // is launched from a parent folder. Without it, Tailwind finds no files and
  // purges every utility class.
  content: {
    relative: true,
    files: ['./index.html', './src/**/*.{js,jsx}'],
  },
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        line: 'var(--line)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-deep': 'var(--accent-deep)',
        'accent-ink': 'var(--accent-ink)',
        good: 'var(--good)',
      },
      fontFamily: {
        // The "stopwatch" look. SF Mono / system monospace — crisp, offline, free.
        clock: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 0 24px -4px var(--accent-glow)',
      },
      maxWidth: {
        app: '520px',
      },
    },
  },
  plugins: [],
}
