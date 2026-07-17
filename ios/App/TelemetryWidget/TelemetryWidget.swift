// TelemetryWidget.swift — the home-screen "DAYS ON THE BOOK" widget.
//
// The manila paper object among the glass icons (design handoff G9 / §16): a
// Split-Book ground, carbon ink, one lane-red ◆ seal, a hairline rule. Its whole
// job is the lifetime total — the number a reset can never touch — with the
// medium family adding a quiet secondary row. Reads the numbers the app pushes
// through @capgo/capacitor-widget-kit (src/lib/widgets.js ← App.jsx); the app
// drives refreshes via reloadWidgets(), so the timeline is one immediate entry.

import WidgetKit
import SwiftUI

// MARK: - Brand palette (mirrors src/index.css Split Book :root tokens)

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
    static let bg = Color(hex: 0xEDE4CE)      // manila page
    static let ink = Color(hex: 0x1F1B12)     // carbon ink
    static let accent = Color(hex: 0xC93F22)  // lane-red seal
    static let line = Color(hex: 0xC9BC9C)    // hairline
    static let muted = Color(hex: 0x6B6150)   // secondary
}

// MARK: - Timeline

struct BriefingEntry: TimelineEntry {
    let date: Date
    let daysOnBook: Int
    let impactScore: Int
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
        BriefingEntry(date: Date(), daysOnBook: 0, impactScore: 0, cardsCompleted: 0, hasData: false)
    }

    private static func current() -> BriefingEntry {
        guard let b = TelemetryWidgetStore.read() else { return empty }
        return BriefingEntry(date: Date(), daysOnBook: b.daysOnBook,
                             impactScore: b.impactScore, cardsCompleted: b.cardsCompleted,
                             hasData: true)
    }
}

// MARK: - View

struct TelemetryWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: BriefingEntry

    private var heroText: String { entry.hasData ? "\(entry.daysOnBook)" : "1" }
    private var heroLabel: String { entry.hasData ? "DAYS ON THE BOOK" : "THE BOOK OPENS" }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Head: the label + the one lane-red ◆ seal, over a hairline.
            HStack(alignment: .top) {
                Text(heroLabel)
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .tracking(1.6)
                    .foregroundStyle(Brand.muted)
                Spacer()
                Text("◆")
                    .font(.system(size: 12))
                    .foregroundStyle(Brand.accent)
            }

            Spacer(minLength: 4)

            // Hero: the lifetime total in carbon mono — never a stark 0.
            Text(entry.hasData ? heroText : "Day one")
                .font(.system(size: entry.hasData ? 46 : 24, weight: .medium, design: .monospaced))
                .foregroundStyle(Brand.ink)
                .minimumScaleFactor(0.5)
                .lineLimit(1)

            if family == .systemMedium {
                Spacer(minLength: 6)
                Rectangle().fill(Brand.line).frame(height: 1)
                Spacer(minLength: 6)
                HStack(alignment: .bottom) {
                    stat("\(entry.impactScore)", "IMPACT")
                    Spacer()
                    stat("\(entry.cardsCompleted)", "CARDS")
                }
            } else {
                Spacer(minLength: 0)
                Rectangle().fill(Brand.line).frame(height: 1)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(URL(string: "telemetry://deck"))
        .telemetryBackground()
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(value).font(.system(size: 16, weight: .medium, design: .monospaced)).foregroundStyle(Brand.ink)
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
    let kind = "TelemetryDaysOnTheBook"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BriefingProvider()) { entry in
            TelemetryWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Days on the book")
        .description("Your lifetime total — the number a reset never touches.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct TelemetryWidgetBundle: WidgetBundle {
    var body: some Widget {
        TelemetryWidget()
    }
}
