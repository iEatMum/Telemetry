// SharedStore.swift — reads the DAILY BRIEFING numbers the app pushes through
// @capgo/capacitor-widget-kit's "full-native widget session" bridge.
//
// Contract (verified against the plugin's Swift, do NOT change loosely):
//   • The plugin opens UserDefaults(suiteName:) where the suite is the value of
//     the Info.plist key `CapgoWidgetKitAppGroup`. THIS extension's Info.plist
//     therefore carries that key set to the SAME group as the app. If it were
//     missing, the plugin's resolver would fall back to
//     `group.<bundleId-minus-last>.widgetkit` — the WRONG suite — and we'd read
//     nothing. (See CapgoWidgetKitSharedStore.resolveAppGroupId.)
//   • A session is stored under key `capgo.widgetkit.native.session.<widgetId>`.
//     The app uses widgetId "daily-briefing" (src/lib/widgets.js → WIDGET_ID).
//   • The value is a JSON `StoredWidgetSessionEnvelope`. Its `stateData` field is
//     base64-encoded `Data` (Foundation JSONEncoder's default for Data) that, once
//     decoded, is itself the JSON of our state object — i.e. it's double-encoded.
//     A plain JSONDecoder() decodes the base64→Data automatically.

import Foundation

enum TelemetryWidgetStore {
    /// Must equal the app's App Group and this extension's `CapgoWidgetKitAppGroup`.
    static let appGroupId = "group.com.ianpalsgaard.telemetry"
    /// `capgo.widgetkit.native.session.` + WIDGET_ID ("daily-briefing").
    static let sessionKey = "capgo.widgetkit.native.session.daily-briefing"

    struct Briefing {
        let impactScore: Int
        let engagedPercent: Int
        let cardsCompleted: Int
        let updatedAt: Date?
    }

    // Only the fields we need. stateData decodes from its base64 string via the
    // decoder's default data strategy — no custom keys/strategy required.
    private struct Envelope: Decodable { let stateData: Data }
    private struct RawState: Decodable {
        let impactScore: Double?
        let engagedPercent: Double?
        let cardsCompleted: Double?
        let updatedAt: Double? // ms epoch (Date.now() on the JS side)
    }

    /// Today's pushed snapshot, or nil when nothing has been written yet (first
    /// run, reinstall, or App Group misconfigured). Never throws.
    static func read() -> Briefing? {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let data = defaults.data(forKey: sessionKey) else { return nil }
        let decoder = JSONDecoder()
        guard let envelope = try? decoder.decode(Envelope.self, from: data),
              let state = try? decoder.decode(RawState.self, from: envelope.stateData)
        else { return nil }
        return Briefing(
            impactScore: Int((state.impactScore ?? 0).rounded()),
            engagedPercent: Int((state.engagedPercent ?? 0).rounded()),
            cardsCompleted: Int((state.cardsCompleted ?? 0).rounded()),
            updatedAt: state.updatedAt.map { Date(timeIntervalSince1970: $0 / 1000) }
        )
    }
}
