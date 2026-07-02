// theme.jsx — the ONE owner of the app's visual skin.
//
// The three themes (terminal / zen / night_ops) are complete CSS-variable
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

export const THEMES = ['terminal', 'zen', 'night_ops']
export const DEFAULT_THEME = 'terminal'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { settings, updateSettings } = useStore()
  // A corrupt / absent value falls back to the default rather than stranding the
  // app on an undefined skin (which would inherit :root's terminal tokens anyway,
  // but this keeps data-theme honest for the transition + Zen glow-off selectors).
  const theme = THEMES.includes(settings.theme) ? settings.theme : DEFAULT_THEME

  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = theme
    // Keep native chrome (status bar text, form controls, scrollbars) in step.
    el.style.colorScheme = theme === 'zen' ? 'light' : 'dark'
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
