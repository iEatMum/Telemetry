// nativeChrome.js — the phone's own chrome, kept in step with the book
// (MASTERPLAN P1 · platform). Two seams, both fail-soft no-ops on web:
//
//   syncStatusBar(theme)  — iOS status-bar glyphs must match the skin: dark
//     text over the manila skins, light text over carbon. Without this the bar
//     keeps whatever iOS guessed at launch and goes unreadable on skin switch.
//   initKeyboardInsets()  — mirrors the keyboard height into --keyboard-inset
//     on <html>, so sheets can pad their inputs clear of the keyboard (the
//     WKWebView doesn't move fixed-position sheets on its own).

import { Capacitor } from '@capacitor/core'

const native = () => Capacitor.isNativePlatform()

export async function syncStatusBar(theme) {
  if (!native()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // Style.Light = light background (dark glyphs); Style.Dark = the inverse.
    // split_book is daylight manila; lamplight + carbon run dark surfaces.
    await StatusBar.setStyle({ style: theme === 'split_book' ? Style.Light : Style.Dark })
  } catch {
    /* plugin not installed on this build — the bar keeps its default */
  }
}

export async function initKeyboardInsets() {
  if (!native()) return () => {}
  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    const root = document.documentElement
    const set = (px) => root.style.setProperty('--keyboard-inset', `${px}px`)
    const show = await Keyboard.addListener('keyboardWillShow', (info) => set(info?.keyboardHeight || 0))
    const hide = await Keyboard.addListener('keyboardWillHide', () => set(0))
    return () => {
      show.remove()
      hide.remove()
      set(0)
    }
  } catch {
    return () => {}
  }
}
