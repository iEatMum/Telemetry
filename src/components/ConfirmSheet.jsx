// ConfirmSheet.jsx — the ceremonial confirm (handoff Proposed Addition #1).
//
// Friction inversion: the costly path is a HOLD, never a tap. The sheet frames
// the act (the tone engine's step.commit line for the evening seal), then the
// press-and-hold attests. Cancel is free and quiet.
// Contract: { title, body, holdLabel, onSeal, onCancel }.

import Sheet from './Sheet.jsx'
import { SealRing } from './ui.jsx'

export default function ConfirmSheet({ title, body, holdLabel = 'Hold to seal', onSeal, onCancel }) {
  return (
    <Sheet title={title} onClose={onCancel}>
      {body && <p className="text-[0.875rem] leading-relaxed text-muted">{body}</p>}
      {/* The ceremony ring (P2 · handoff D2): press-sweep → ◆ stamp → settle.
          Same contract the old hold bar carried — early release free, keyboard
          hold works, quick taps arm a two-step confirm. */}
      <SealRing onComplete={onSeal}>{holdLabel}</SealRing>
      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2 text-center text-sm text-muted"
      >
        Not yet
      </button>
    </Sheet>
  )
}
