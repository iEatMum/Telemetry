// GuardMonitor.swift — the danger-window enforcer (MASTERPLAN Phase 3c).
//
// Compiled by the **TelemetryGuard** extension target (Xcode: File → New →
// Target → "Device Activity Monitor Extension", name it TelemetryGuard, then
// replace the generated monitor with this file). iOS launches this at the
// scheduled window's edges — the app itself can be closed for days and the
// shield still rises and falls on time.
//
// It reads the SAME App-Group selection ScreenGuardPlugin saves and writes the
// SAME named ManagedSettingsStore, so "lift the shield" inside the app and the
// window's automatic end are one mechanism.

import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

class GuardMonitor: DeviceActivityMonitor {
    let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("telemetryGuard"))
    let defaults = UserDefaults(suiteName: "group.com.ianpalsgaard.telemetry")

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        guard let data = defaults?.data(forKey: "screenguard.selection"),
              let sel = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return }
        store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
        store.shield.applicationCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
        store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
        defaults?.set(true, forKey: "screenguard.shieldActive")
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        store.clearAllSettings()
        defaults?.set(false, forKey: "screenguard.shieldActive")
    }
}
