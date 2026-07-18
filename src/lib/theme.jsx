// theme.jsx — the ONE owner of the app's visual skin.
//
// The three themes (split_book / lamplight / carbon) are complete CSS-variable
// palettes in index.css. This provider decides WHICH one is live and writes it to
// `data-theme` on <html> (documentElement) — deliberately NOT on a nested <div>,
// so <body>, the safe-area gutters, ::selection and native form controls all pick
// up the palette. Anything below reads/sets it through useTheme().
//
// PERSISTENCE is free: the choice lives in settings.theme, which already rides the
// `settings` singleton through sync.js — so a theme picked on one device follows
// the user to the next, offline-first, with no extra plumbing. (index.html carries
// a tiny inline script that applies the persisted theme before React boots, so
// there's no first-paint flash of the default.)

import { createContext, useContext, useEffect } from 'react'
import { useStore } from './store.jsx'
import { syncStatusBar } from './nativeChrome.js'

export const THEMES = ['split_book', 'lamplight', 'carbon']
export const DEFAULT_THEME = 'split_book'

// Pre-Split-Ledger installs persisted the old skin names; map each to its
// closest descendant so nobody's saved choice strands them on the default.
export const LEGACY_THEMES = { zen: 'split_book', night_ops: 'lamplight', terminal: 'carbon' }

/** The live skin for a raw settings.theme value: current key, migrated legacy
 *  key, or the default. */
export function resolveTheme(raw) {
  if (THEMES.includes(raw)) return raw
  if (Object.prototype.hasOwnProperty.call(LEGACY_THEMES, raw)) return LEGACY_THEMES[raw]
  return DEFAULT_THEME
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { settings, updateSettings } = useStore()
  // A corrupt / absent value falls back to the default rather than stranding the
  // app on an undefined skin; a legacy value migrates in place below.
  const theme = resolveTheme(settings.theme)

  // One-time migration: rewrite a persisted legacy key so sync carries the new
  // name forward and validate.js (which only knows current keys) keeps it.
  useEffect(() => {
    if (Object.prototype.hasOwnProperty.call(LEGACY_THEMES, settings.theme)) updateSettings({ theme })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.theme])

  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = theme
    // Keep native chrome (status bar text, form controls, scrollbars) in step.
    el.style.colorScheme = theme === 'split_book' ? 'light' : 'dark'
    // And the REAL iOS status bar (P1 platform): dark glyphs over manila, light
    // over the dark skins. Fail-soft no-op on web.
    syncStatusBar(theme)
  }, [theme])

  const value = {
    theme,
    themes: THEMES,
    setTheme: (t) => {
      if (THEMES.includes(t)) updateSettings({ theme: t })
    },
  }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
