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
      if (e.key !== 'Escape') return
      if (stack[stack.length - 1] === id) onClose()
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
