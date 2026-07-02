// TelemetryWidget.swift — the home-screen DAILY BRIEFING widget. Reads the
// numbers the app pushes (engaged %, impact done, cards engaged) and renders them
// in the "perps terminal" look (electric green on near-black, monospaced).
//
// The app drives refreshes: it writes the session and calls reloadWidgets() after
// every stat change (src/lib/widgets.js ← App.jsx), so the timeline is a single
// immediate entry with `.never` — no time-based polling needed.

import WidgetKit
import SwiftUI

// MARK: - Brand palette (mirrors src/index.css :root dark tokens)

private extension Color {
    init(hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xff) / 255,
                  green: Double((hex >> 8) & 0xff) / 255,
                  blue: Double(hex & 0xff) / 255,
                  opacity: 1)
    }
}

private enum Brand {
    static let bg = Color(hex: 0x06080b)
    static let accent = Color(hex: 0x16f08b)
    static let muted = Color(hex: 0x707b8c)
    static let line = Color(hex: 0x232a33)
}

// MARK: - Timeline

struct BriefingEntry: TimelineEntry {
    let date: Date
    let impactScore: Int
    let engagedPercent: Int
    let cardsCompleted: Int
    let hasData: Bool
}

struct BriefingProvider: TimelineProvider {
    func placeholder(in context: Context) -> BriefingEntry { Self.empty }

    func getSnapshot(in context: Context, completion: @escaping (BriefingEntry) -> Void) {
        completion(Self.current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BriefingEntry>) -> Void) {
        completion(Timeline(entries: [Self.current()], policy: .never))
    }

    private static var empty: BriefingEntry {
        BriefingEntry(date: Date(), impactScore: 0, engagedPercent: 0, cardsCompleted: 0, hasData: false)
    }

    private static func current() -> BriefingEntry {
        guard let b = TelemetryWidgetStore.read() else { return empty }
        return BriefingEntry(date: Date(), impactScore: b.impactScore,
                             engagedPercent: b.engagedPercent, cardsCompleted: b.cardsCompleted,
                             hasData: true)
    }
}

// MARK: - View

struct TelemetryWidgetEntryView: View {
    var entry: BriefingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 5) {
                Circle().fill(Brand.accent).frame(width: 6, height: 6)
                Text("DAILY BRIEFING")
                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                    .tracking(1.5)
                    .foregroundStyle(Brand.muted)
            }

            Spacer(minLength: 6)

            Text("\(entry.engagedPercent)%")
                .font(.system(size: 36, weight: .bold, design: .monospaced))
                .foregroundStyle(entry.hasData ? Brand.accent : Brand.muted)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text("ENGAGED")
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .tracking(1.5)
                .foregroundStyle(Brand.muted)

            Spacer(minLength: 6)

            HStack(alignment: .bottom) {
                stat("\(entry.impactScore)", "IMPACT")
                Spacer()
                stat("\(entry.cardsCompleted)", "CARDS")
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(URL(string: "telemetry://briefing"))
        .telemetryBackground()
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(value).font(.system(size: 16, weight: .bold, design: .monospaced)).foregroundStyle(.white)
            Text(label).font(.system(size: 8, weight: .medium, design: .monospaced)).tracking(1).foregroundStyle(Brand.muted)
        }
    }
}

// containerBackground is required on iOS 17+ (or the widget loses its background);
// fall back to a plain background on iOS 16.
private extension View {
    @ViewBuilder func telemetryBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.padding(14).containerBackground(Brand.bg, for: .widget)
        } else {
            self.padding(14).background(Brand.bg)
        }
    }
}

// MARK: - Widget

struct TelemetryWidget: Widget {
    let kind = "TelemetryDailyBriefing"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BriefingProvider()) { entry in
            TelemetryWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Briefing")
        .description("Today's engagement, impact, and cards — live from the app.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct TelemetryWidgetBundle: WidgetBundle {
    var body: some Widget {
        TelemetryWidget()
    }
}
