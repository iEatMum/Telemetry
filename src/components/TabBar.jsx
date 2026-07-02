// TabBar.jsx — three faces, three tabs. Morning (commitment) · Examen (the
// evening reckoning) · Offerings (the spiritual life, un-scored). The heavier
// surfaces (Streak, Sprint, Money, Train) open as sub-views under Morning, so
// the bottom nav stays calm. Inline SVG icons, no icon library.

const ICONS = {
  morning: (
    // a sun rising over the horizon
    <>
      <path d="M3 18h18" />
      <path d="M16 18a4 4 0 0 0-8 0" />
      <path d="M12 4v4M5.5 9.5 7 11M18.5 9.5 17 11M3 14h2M19 14h2" />
    </>
  ),
  examen: (
    // a crescent moon — the evening
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8z" />
  ),
  offerings: (
    // an open book
    <>
      <path d="M12 6C10 4.5 6.5 4.5 4 6v13c2.5-1.5 6-1.5 8 0 2-1.5 5.5-1.5 8 0V6c-2.5-1.5-6-1.5-8 0z" />
      <path d="M12 6v13" />
    </>
  ),
}

const TABS = [
  { id: 'morning', label: 'Morning' },
  { id: 'examen', label: 'Examen' },
  { id: 'offerings', label: 'Offerings' },
]

export default function TabBar({ active, onChange }) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-app -translate-x-1/2 border-t border-line bg-bg/95 pb-safe backdrop-blur"
      aria-label="Primary"
    >
      <ul className="flex">
        {TABS.map((t) => {
          const on = active === t.id
          return (
            <li key={t.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className="flex h-16 w-full flex-col items-center justify-center gap-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 ${on ? 'text-accent' : 'text-muted'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[t.id]}
                </svg>
                <span className={`text-[11px] ${on ? 'text-ink font-medium' : 'text-muted'}`}>{t.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
