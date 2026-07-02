// Deck.jsx — TEMPORARY widget gallery for P3.1 review (remove before ship).
//
// Reachable WITHOUT login at /?demo (wired in main.jsx) so the new terminal
// "deck" can be inspected all in one place. Everything here is mock data — no
// store, no backend, no AI. Purely the presentation layer from ui.jsx.

import {
  Card,
  SectionLabel,
  Stat,
  Grid,
  KpiTile,
  Sparkline,
  BarMeter,
  DataTable,
  DeltaTag,
  Chip,
} from '../components/ui.jsx'

// --- mock series ------------------------------------------------------------
const up = [2, 3, 3, 5, 4, 6, 7, 8, 8, 11]
const down = [9, 8, 8, 6, 7, 5, 5, 4, 3, 3]
const wave = [4, 6, 5, 7, 6, 8, 5, 9, 7, 10]
const flatish = [5, 5, 6, 5, 6, 5, 6, 6, 5, 6]

// schedule / protocol table rows
const STATUS = {
  hit: <span className="font-clock text-[11px] uppercase tracking-wide text-pos">on time</span>,
  done: <span className="font-clock text-[11px] uppercase tracking-wide text-pos">done</span>,
  late: <span className="font-clock text-[11px] uppercase tracking-wide text-neg">late</span>,
  open: <span className="font-clock text-[11px] uppercase tracking-wide text-muted">open</span>,
}
const scheduleRows = [
  { id: 1, time: '05:30', block: 'Wake', status: STATUS.hit, delta: <DeltaTag value="0m" dir="flat" /> },
  { id: 2, time: '06:00', block: 'Run · 6 mi', status: STATUS.done, delta: <DeltaTag value="-40s/mi" dir="up" /> },
  { id: 3, time: '09:00', block: 'Deep Work', status: STATUS.done, delta: <DeltaTag value="+15m" dir="up" /> },
  { id: 4, time: '13:00', block: 'Lecture', status: STATUS.done, delta: <DeltaTag value="0m" dir="flat" /> },
  { id: 5, time: '18:30', block: 'Film study', status: STATUS.open, delta: <span className="text-muted">—</span> },
  { id: 6, time: '22:15', block: 'Phone down', status: STATUS.late, delta: <DeltaTag value="-18m" dir="down" /> },
]

export default function Deck() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-app space-y-6 px-4 pb-20 pt-8">
        {/* Header */}
        <header>
          <div className="flex items-center justify-between">
            <SectionLabel>P3.1 · Widget Deck</SectionLabel>
            <span className="font-clock text-[10px] uppercase tracking-widest2 text-pos">● live</span>
          </div>
          <h1 className="mt-1 font-clock text-2xl font-semibold uppercase tracking-widest2">
            Command Center
          </h1>
          <p className="mt-1 text-xs text-muted">
            Temporary demo (<span className="font-clock">?demo</span>) · mock data · no backend wired
          </p>
        </header>

        {/* KPI tiles */}
        <section>
          <SectionLabel className="mb-2">KPIs</SectionLabel>
          <Grid cols={2} gap={10}>
            <KpiTile label="Wake Streak" value="23" unit="days" delta={12} deltaSuffix="%" spark={up} accent />
            <KpiTile label="Deep Work" value="4.5" unit="hrs" delta={18} deltaSuffix="%" spark={wave} accent />
            <KpiTile label="Discipline" value="92" unit="%" delta={-3} deltaSuffix="%" spark={down} sparkTone="neg" />
            <KpiTile label="Sleep" value="7.2" unit="hrs" delta={5} deltaSuffix="%" spark={flatish} />
          </Grid>
        </section>

        {/* Stat row inside a card */}
        <section>
          <SectionLabel className="mb-2">Today</SectionLabel>
          <Card className="px-3 py-1">
            <Grid cols={3} gap={4}>
              <Stat label="Sprints" value="3" delta={1} accent />
              <Stat label="Miles" value="6.2" delta={0.5} />
              <Stat label="Focus" value="86%" delta={-4} deltaSuffix="%" />
            </Grid>
          </Card>
        </section>

        {/* Meters */}
        <section>
          <SectionLabel className="mb-2">Goals &amp; Readiness</SectionLabel>
          <Card className="space-y-4 p-4">
            <BarMeter label="Monthly income" value={2400} max={3500} right="$2,400 / $3,500" tone="accent" />
            <BarMeter label="Weekly mileage" value={28} max={35} right="28 / 35 mi" tone="pos" />
            <BarMeter label="Readiness" value={4} max={5} right="4 / 5" tone="pos" />
            <BarMeter label="Recovery debt" value={2.5} max={5} right="elevated" tone="warn" />
          </Card>
        </section>

        {/* Standalone sparklines */}
        <section>
          <SectionLabel className="mb-2">Trend</SectionLabel>
          <Grid cols={2} gap={10}>
            <Card className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest2 text-muted">Bankroll</span>
                <DeltaTag value={9} dir="up" suffix="%" />
              </div>
              <div className="mt-3">
                <Sparkline data={up} tone="pos" height={44} />
              </div>
            </Card>
            <Card className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest2 text-muted">Drawdown</span>
                <DeltaTag value={-6} dir="down" suffix="%" />
              </div>
              <div className="mt-3">
                <Sparkline data={down} tone="neg" height={44} />
              </div>
            </Card>
          </Grid>
        </section>

        {/* Data table */}
        <section>
          <SectionLabel className="mb-2">Schedule Matrix</SectionLabel>
          <Card className="overflow-hidden">
            <DataTable
              columns={[
                { key: 'time', label: 'Time', numeric: true },
                { key: 'block', label: 'Block' },
                { key: 'status', label: 'Status' },
                { key: 'delta', label: 'Δ', align: 'right' },
              ]}
              rows={scheduleRows}
            />
          </Card>
        </section>

        {/* Chips strip — confirms the pill/toggle look on the terminal theme */}
        <section>
          <SectionLabel className="mb-2">Controls</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Chip active onClick={() => {}}>Today</Chip>
            <Chip active={false} onClick={() => {}}>Week</Chip>
            <Chip active={false} onClick={() => {}}>Month</Chip>
            <Chip active={false} onClick={() => {}}>All</Chip>
          </div>
        </section>
      </div>
    </div>
  )
}
