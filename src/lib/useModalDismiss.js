// useModalDismiss — shared dialog manners for every overlay (Sheet, LegalSheet,
// Paywall). A LIFO modal stack so a single Escape dismisses only the TOP-most
// dialog, not every layer at once: with Settings open and the fine print stacked
// over it, Escape closes the fine print and LEAVES settings. Also moves focus
// into the sheet on open so assistive tech reads the dialog, not the surface
// underneath. The night page (UrgeProtocol Shell) deliberately opts out of
// Escape — its ✕ is the one intentional exit — so it isn't on this stack.

import { useEffect, useId } from 'react'

const stack = []

export function useModalDismiss(onClose, focusRef) {
  const id = useId()
  useEffect(() => {
    stack.push(id)
    focusRef?.current?.focus?.()
    const onKey = (e) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape') return onClose()
      // Focus CONTAINMENT (P1 a11y): Tab cycles inside the top dialog instead
      // of wandering into the deck behind it. aria-modal already hides the
      // background from assistive tech; this closes the same hole for the
      // keyboard. The dialog element is found from the focus anchor, so every
      // caller gets containment without a signature change.
      if (e.key === 'Tab') {
        const dialog = focusRef?.current?.closest?.('[role="dialog"]')
        if (!dialog) return
        const focusables = dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const inside = dialog.contains(document.activeElement)
        if (e.shiftKey && (!inside || document.activeElement === first)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      const i = stack.lastIndexOf(id)
      if (i >= 0) stack.splice(i, 1)
      window.removeEventListener('keydown', onKey)
    }
    // onClose identity may change per render; re-binding is harmless and keeps
    // the closure current. id/focusRef are stable.
  }, [onClose, id, focusRef])
}
