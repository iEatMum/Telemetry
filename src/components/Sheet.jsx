// Sheet.jsx — a bottom sheet / modal shell. Tap the backdrop (or the ✕, or
// Escape) to close. Shared by the reset journal, settings, confirm, and wellness.
//
// Dialog manners match LegalSheet: role=dialog + aria-modal so the surface
// underneath is hidden from assistive tech, focus lands on Close when it opens,
// and the backdrop is aria-hidden so VoiceOver's first stop is the sheet TITLE,
// not a screen-spanning "Close" button.

import { useId, useRef } from 'react'
import { useModalDismiss } from '../lib/useModalDismiss.js'

export default function Sheet({ title, onClose, children }) {
  const closeRef = useRef(null)
  const titleId = useId()
  useModalDismiss(onClose, closeRef)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex flex-col justify-end"
    >
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        className="relative mx-auto max-h-[90vh] w-full max-w-app overflow-y-auto rounded-t-sheet border-t border-line bg-surface p-5 pb-safe"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--keyboard-inset, 0px))' }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"
        >
          ✕
        </button>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
        <h2 id={titleId} className="mb-3 pr-10 text-lg font-semibold">
          {title}
        </h2>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}
