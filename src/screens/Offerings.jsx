// Offerings.jsx — the third face. The spiritual life, deliberately de-gamified.
//
// Prayer and scripture were a checklist item you could "miss" (a red-adjacent
// failure for a man already weighing his faith). That re-imports the exact shame
// this app fights. So they live here now as OFFERINGS, not metrics: no score, no
// streak, no miss state, no counter pressure. Offered, not performed.
//
// The reading plan keeps a gentle position marker (it's navigation through John,
// not a streak) — moving through scripture, at your own pace.

import { useStore } from '../lib/store.jsx'
import { Card, SectionLabel } from '../components/ui.jsx'
import { verseForDay } from '../lib/verses.js'

export default function Offerings({ wakeTime }) {
  const { reading, advanceReading, settings } = useStore()
  const verse = verseForDay()
  const wake = wakeTime || settings.wakeTime || '06:45'
  const done = reading.index >= reading.plan.length
  const current = done ? null : reading.plan[reading.index]

  return (
    <div className="space-y-6 pb-24 pt-3">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Offerings</h1>
        <p className="max-w-[40ch] text-[13px] leading-relaxed text-muted">
          Not tracked. Not scored. These are offered, not performed.
        </p>
      </header>

      {/* Verse */}
      <Card className="overflow-hidden">
        <div className="border-l-2 border-accent p-5">
          <SectionLabel>Today&rsquo;s verse</SectionLabel>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{verse.text}</p>
          <div className="mt-3 font-clock text-sm text-accent">{verse.ref}</div>
        </div>
      </Card>

      {/* Prayer + Bible — an offering, framed as an if-then cue, never scored */}
      <section className="space-y-2">
        <SectionLabel className="px-1">Prayer &amp; Bible</SectionLabel>
        <Card className="p-5">
          <p className="text-[15px] leading-relaxed text-ink">
            When you sit down after waking ({wake}) &rarr; prayer + Bible, 15 minutes.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            A cue, not a quota. Some mornings it&rsquo;s fifteen minutes; some
            mornings it&rsquo;s one honest sentence. Both count, and neither is
            counted.
          </p>
        </Card>
      </section>

      {/* Reading plan — gentle position, no streak */}
      <section className="space-y-2">
        <div className="px-1">
          <SectionLabel>Reading — the Gospel of John</SectionLabel>
        </div>
        <Card className="p-5">
          {done ? (
            <p className="text-[15px] text-ink">You&rsquo;ve read all the way through. Add the next book in Settings.</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="font-clock text-xl text-ink">{current}</span>
              <button
                type="button"
                onClick={advanceReading}
                className="rounded-xl border border-accent px-4 py-2 text-sm font-medium text-accent"
              >
                Read &rarr;
              </button>
            </div>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            No streak to break. Move at the pace it asks of you.
          </p>
        </Card>
      </section>
    </div>
  )
}
