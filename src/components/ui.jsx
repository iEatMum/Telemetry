// ui.jsx — the few shared building blocks. Deliberately small: most styling
// lives inline in each screen so the Tailwind classes stay easy to read and
// tweak. Only genuinely repeated shapes get a component here.

export function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`rounded-2xl bg-surface border border-line ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// A small all-caps label above a section. Quiet by design.
export function SectionLabel({ children, className = '' }) {
  return (
    <div
      className={`text-xs font-medium uppercase tracking-wider text-muted ${className}`}
    >
      {children}
    </div>
  )
}

// One number in the stat row: big tabular numeral + tiny caption.
export function Stat({ value, label, accent = false }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 py-3">
      <div
        className={`font-clock tnum text-2xl leading-none ${
          accent ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted text-center">
        {label}
      </div>
    </div>
  )
}
