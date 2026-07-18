// DayPlanSheet.jsx — the day-plan editor: the in-app half of dictation.
//
// Onboarding's "Dictate your day" writes the first settings.dayBlocks; this
// sheet edits the same list any day after. Only the user's own blocks live
// here — the wake/phone bookends and the focus block are derived from their
// survey answers and stay in Settings. The Today heat sheet prints these rows
// in time order (untimed lines follow), so what you write here IS the day.
//
// Opened from the deck's in-flow "Dictate the day" line and from Settings,
// via the same shell-owned-overlay idiom as the urge/paywall sheets
// (window event → App.jsx mounts it above every surface).

import { useStore } from '../lib/store.jsx'
import Sheet from './Sheet.jsx'

const MAX_BLOCKS = 12

export function openDayPlan() {
  window.dispatchEvent(new Event('telemetry:open-dayplan'))
}

export default function DayPlanSheet({ onClose }) {
  const { settings, updateSettings } = useStore()
  const blocks = settings.dayBlocks || []
  const write = (next) => updateSettings({ dayBlocks: next })
  const patch = (id, field, value) => write(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  const remove = (id) => write(blocks.filter((b) => b.id !== id))
  const add = () =>
    write([...blocks, { id: `dict-${Date.now().toString(36)}`, time: '', block: '', impact: undefined }])

  // Blank lines are scratch, not entries — they drop when the sheet closes.
  const close = () => {
    const kept = blocks.filter((b) => b.block && b.block.trim())
    if (kept.length !== blocks.length) write(kept)
    onClose()
  }

  return (
    <Sheet title="Dictate the day" onClose={close}>
      <p className="text-[0.75rem] leading-relaxed text-muted">
        Your blocks, in your words — the Today page prints them in time order (untimed lines follow).
        ◆ marks the block the day hinges on; it becomes the deep-work timer.
      </p>

      <div className="space-y-2">
        {blocks.map((b, i) => (
          <div key={b.id || i} className="flex items-stretch gap-2">
            <input
              type="time"
              value={b.time || ''}
              onChange={(e) => patch(b.id, 'time', e.target.value)}
              aria-label={`Block ${i + 1} time (optional)`}
              className="min-w-[112px] flex-none rounded-md border border-line bg-surface2 px-1 py-2.5 text-center font-clock tnum text-[0.8125rem] text-ink outline-none focus:border-accent-deep"
            />
            <input
              type="text"
              value={b.block || ''}
              onChange={(e) => patch(b.id, 'block', e.target.value)}
              placeholder="The block, in your words"
              aria-label={`Block ${i + 1}`}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface2 px-3 py-2.5 text-[0.875rem] text-ink outline-none placeholder:text-muted focus:border-accent-deep"
            />
            <button
              type="button"
              onClick={() => patch(b.id, 'impact', b.impact === 'high' ? undefined : 'high')}
              aria-pressed={b.impact === 'high'}
              aria-label={`Mark block ${i + 1} high-impact`}
              className={
                'w-10 flex-none rounded-md border font-clock text-[0.875rem] transition-colors ' +
                (b.impact === 'high'
                  ? 'border-accent-deep bg-surface2 text-accent'
                  : 'border-line bg-surface2 text-muted')
              }
            >
              ◆
            </button>
            <button
              type="button"
              onClick={() => remove(b.id)}
              aria-label={`Remove block ${i + 1}`}
              className="w-10 flex-none rounded-md border border-line bg-surface2 text-[0.875rem] text-muted"
            >
              ✕
            </button>
          </div>
        ))}
        {!blocks.length && (
          <p className="rounded-md border border-dashed border-line px-4 py-5 text-center text-[0.8125rem] text-muted">
            Nothing dictated yet — the page is waiting on your words.
          </p>
        )}
      </div>

      {blocks.length < MAX_BLOCKS && (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-md border border-line bg-surface2 py-3 text-sm text-ink"
        >
          + Add a block
        </button>
      )}

      <button type="button" onClick={close} className="w-full py-2 text-sm text-muted">
        Done
      </button>
    </Sheet>
  )
}
