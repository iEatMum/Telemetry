// registry.js — the widget allow-list (P3.2).
//
// THE security boundary of the Server-Driven UI. A payload's block.type is just
// a string; it can only ever resolve to one of the components mapped here. An
// unknown type renders a safe placeholder (see BlockRenderer) — never code, never
// an error. To expose a new widget to the AI, you add it here. Nothing else can.

import {
  ScheduleMatrix,
  KpiGrid,
  StatRow,
  BiometricChart,
  GoalProgress,
  DeepWorkTimer,
  InsightCard,
  DailyBriefing,
} from '../components/widgets.jsx'
import { EnergyTrendLine } from '../components/widgets/EnergyTrendLine.jsx'
import { MarketSentimentWidget } from '../components/widgets/MarketSentimentWidget.jsx'

export const REGISTRY = {
  ScheduleMatrix,
  KpiGrid,
  StatRow,
  BiometricChart,
  GoalProgress,
  DeepWorkTimer,
  InsightCard,
  DailyBriefing,
  EnergyTrendLine,
  MarketSentimentWidget,
}

/** The component for a type, or null if the type isn't allow-listed. */
export function getWidget(type) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, type) ? REGISTRY[type] : null
}

/** Every type the current build can render — handy for validation / docs. */
export const KNOWN_TYPES = Object.keys(REGISTRY)
