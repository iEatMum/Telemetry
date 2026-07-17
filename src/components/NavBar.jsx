// NavBar.jsx — the shell's bottom navigation. Five SURFACES, not content tabs:
// the generative deck keeps its own payload-driven tab strip inside DECK (the
// AI still owns that layout); this bar just switches which surface is mounted.
// Successor to the retired TabBar.jsx (morning/examen/offerings), same idiom:
// inline SVG icons, no icon library, pb-safe over the home indicator.

const ICONS = {
  deck: (
    // stacked cards — the dealt deck
    <>
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M6 7h12M8 4h8" />
    </>
  ),
  sprints: (
    // stopwatch
    <>
      <circle cx="12" cy="14" r="7" />
      <path d="M12 11v3.5l2.5 1.5M10 2h4M12 2v3" />
    </>
  ),
  health: (
    // pulse line
    <path d="M3 12h4l2-6 4 12 2-6h6" />
  ),
  guardian: (
    // shield
    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
  ),
  command: (
    // sliders
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
}

const SURFACES = [
  { id: 'deck', label: 'Deck' },
  { id: 'sprints', label: 'Sprints' },
  { id: 'health', label: 'Health' },
  { id: 'guardian', label: 'Guardian' },
  { id: 'command', label: 'Command' },
]

export default function NavBar({ active, onChange, onHelp }) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2 border-t border-line bg-bg/95 pb-safe backdrop-blur"
      aria-label="Primary"
    >
      <ul className="flex">
        {SURFACES.map((s) => {
          const on = active === s.id
          return (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(s.id)}
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
                  {ICONS[s.id]}
                </svg>
                <span
                  className={`font-clock text-[10px] uppercase tracking-widest2 ${
                    on ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {s.label}
                </span>
              </button>
            </li>
          )
        })}
        {/* HELP — the crisis path, docked as a permanent nav slot (M2) so it can
            never float over content. One tap from any surface; lane-red is
            sanctioned here (crisis = the commitment path under pressure). */}
        {onHelp && (
          <li className="flex-1">
            <button
              type="button"
              onClick={onHelp}
              aria-label="Help now"
              className="flex h-16 w-full flex-col items-center justify-center gap-1"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
              </svg>
              <span className="font-clock text-[10px] font-semibold uppercase tracking-widest2 text-accent">
                Help
              </span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
