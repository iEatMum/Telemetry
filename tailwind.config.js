/** @type {import('tailwindcss').Config} */
// Colors are wired to CSS variables (see src/index.css). One source of truth:
// the terminal palette lives in the vars, so re-skinning never touches a
// component — the dark/light terminal themes just repoint the same names.
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
        // Surface stack — bg → surface → surface-2 (near-black, stepping up)
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        // Structure
        line: 'var(--line)',
        linebright: 'var(--line-bright)',
        // Text
        ink: 'var(--text)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        // Primary action — the lane-red seal of commitment
        accent: 'var(--accent)',
        'accent-deep': 'var(--accent-deep)',
        'accent-ink': 'var(--accent-ink)',
        'accent-glow': 'var(--accent-glow)',
        // Semantic state — strict green-up / red-down, plus a caution amber.
        pos: 'var(--pos)',
        neg: 'var(--neg)',
        warn: 'var(--warn)',
        'pos-soft': 'var(--pos-soft)',
        'neg-soft': 'var(--neg-soft)',
        'warn-soft': 'var(--warn-soft)',
        // Legacy (still-water "Witness" greyscale) — kept mapped until
        // RecordLedger is replaced, so its styling doesn't regress in P3.0.
        witness: {
          bar: 'var(--text)',
          label: 'var(--muted)',
        },
        // Marketing-only "command center" palette (waitlist/landing). Resolves to
        // vars from src/marketing-theme.css, loaded only on the waitlist route;
        // inert in the app (no app component uses these m* utilities).
        mbg: 'var(--m-bg)',
        mbg2: 'var(--m-bg-2)',
        mpanel: 'var(--m-panel)',
        mpanel2: 'var(--m-panel-2)',
        mline: 'var(--m-line)',
        mlinebright: 'var(--m-line-bright)',
        mink: 'var(--m-ink)',
        mmuted: 'var(--m-muted)',
        mfaint: 'var(--m-faint)',
        mgreen: 'var(--m-green)',
        mgreenink: 'var(--m-green-ink)',
        mamber: 'var(--m-amber)',
        mred: 'var(--m-red)',
      },
      fontFamily: {
        // The stopwatch face: clocks, ledgers, tabular readouts, splits, totals.
        // IBM Plex Mono is bundled (main.jsx imports 400/500); SF Mono backstops.
        clock: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        // Human voice: body copy, supportive lines, UI — also the intercom.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
        // Ceremony: WeeklyReview headlines, Guardian marginalia italic ONLY.
        // ui-serif = New York on iOS; Georgia backstops non-Apple engines.
        serif: ['ui-serif', 'New York', 'Source Serif 4', 'Georgia', 'serif'],
      },
      fontSize: {
        // Section label
        label: ['0.6875rem', { letterSpacing: '0.18em', lineHeight: '1' }],
        // Ledger / tabular rows
        ledger: ['0.8125rem', { lineHeight: '1' }],
      },
      letterSpacing: {
        // Section labels and machine-truth headings
        widest2: '0.18em',
        widest3: '0.2em',
      },
      // De-boxing at the token level (Split Ledger): cards print square —
      // xl/2xl/3xl (the card classes) collapse to 0, while sm→lg stay ≤6px for
      // tappable controls. Pills (rounded-full) stay pills: the seal, radios,
      // status dots.
      borderRadius: {
        sm: '0.125rem', // 2px
        DEFAULT: '0.1875rem', // 3px
        md: '0.3125rem', // 5px
        lg: '0.375rem', // 6px — the control ceiling
        xl: '0', // cards: square
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
        // Handoff radius tokens (D1). Cards/sections stay square (xl/2xl/3xl→0);
        // controls take 6px; the bottom-sheet lifts on a single 10px top lip.
        control: 'var(--radius-control)', // 6px
        sheet: 'var(--radius-sheet)', // 10px — sheet lip only (rounded-t-sheet)
      },
      boxShadow: {
        // Print does not glow: every skin sets --accent-glow fully transparent,
        // so these legacy hooks resolve to nothing without component edits.
        glow: '0 0 24px -4px var(--accent-glow)',
        'glow-sm': '0 0 12px -2px var(--accent-glow)',
        'glow-inset': 'inset 0 0 18px -6px var(--accent-glow)',
      },
      maxWidth: {
        app: '520px',
      },
      transitionDuration: {
        // Hold-to-surrender fill
        hold: '1200ms',
        'hold-cancel': '150ms',
        // Handoff motion tokens: taps/toggles vs sheets/overlays.
        quick: '140ms',
        calm: '280ms',
      },
      transitionTimingFunction: {
        hold: 'linear',
      },
      keyframes: {
        'pulse-accent': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        // Subtle fade-in for cards appearing
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Marketing: slow glow breath for the live clock readout.
        breathe: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.62' } },
      },
      animation: {
        'pulse-accent': 'pulse-accent 2s ease-in-out infinite',
        'fade-up': 'fade-up 0.25s ease-out',
        breathe: 'breathe 2000ms cubic-bezier(0.4,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
}
