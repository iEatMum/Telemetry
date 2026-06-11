// TabBar.jsx — the 5 bottom tabs. Fixed to the bottom, thumb-reachable,
// 44px+ targets, with the iOS home-indicator safe area respected.
// Inline SVG icons (no icon library) so there are no extra dependencies.

const ICONS = {
  today: (
    <path d="M12 3v2M4.9 6.3 6.3 7.7M19.1 6.3 17.7 7.7M3 12h2M19 12h2M12 8a4 4 0 100 8 4 4 0 000-8z" />
  ),
  streak: (
    // a flame
    <path d="M12 3c.5 3-1.8 4.2-2.7 5.7C8.2 10.6 8 12 8 13a4 4 0 008 0c0-1.4-.6-2.7-1.4-3.7.3 1.2-.2 2.2-1 2.6.4-1.6-.2-3.5-1.6-4.8C12.9 5.7 13 4.2 12 3z" />
  ),
  sprint: (
    // a stopwatch
    <>
      <path d="M12 8v4l2 2" />
      <circle cx="12" cy="13" r="7" />
      <path d="M9 2h6M12 2v2" />
    </>
  ),
  money: (
    // bars + value
    <path d="M5 20V10M12 20V4M19 20v-7M3 20h18" />
  ),
  train: (
    // a running track
    <>
      <rect x="3" y="7" width="18" height="10" rx="5" />
      <path d="M8 12h8" />
    </>
  ),
}

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'streak', label: 'Streak' },
  { id: 'sprint', label: 'Sprint' },
  { id: 'money', label: 'Money' },
  { id: 'train', label: 'Train' },
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
                <span
                  className={`text-[11px] ${on ? 'text-ink font-medium' : 'text-muted'}`}
                >
                  {t.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
