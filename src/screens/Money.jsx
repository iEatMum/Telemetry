import { Card } from '../components/ui.jsx'

// Phase 2. Placeholder now so the tab exists and the IA is complete.
export default function Money() {
  return (
    <ComingInPhase2
      title="Money"
      line="Track income toward $3,500/month."
      bullets={[
        'Goal bar + required daily pace',
        'Log income: Job · Roblox · Other',
        'Lifetime banked total, front and center',
      ]}
    />
  )
}

export function ComingInPhase2({ title, line, bullets }) {
  return (
    <div className="pt-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-muted">{line}</p>
      <Card className="mt-5 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-accent">
          Coming in Phase 2
        </div>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-accent">—</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-xs text-muted">
        Phase 1 ships Today, Streak, and Sprint first. Finish a full real day on
        those before this lights up.
      </p>
    </div>
  )
}
