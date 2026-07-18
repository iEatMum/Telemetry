// ScreenGuardPlugin.swift — app lockdown (MASTERPLAN Phase 3c, the flagship).
//
// FamilyControls + ManagedSettings + DeviceActivity ("the Screen Time API"),
// exposed to the web layer as the `ScreenGuard` Capacitor plugin (registered in
// AppViewController.capacitorDidLoad; JS seam: src/lib/lockdown.js).
//
// Privacy is structural: the user picks apps via the system FamilyActivityPicker
// and the selection is OPAQUE TOKENS — this app never learns which apps were
// chosen. The selection persists in the App Group so the TelemetryGuard
// DeviceActivity extension (ios/App/TelemetryGuard/) can apply the shield at
// the danger window's edges even while this app is closed.
//
// Psychology spine (CONSTITUTION): the shield is USER-AUTHORED armor, never a
// punishment. Lifting it is always possible from inside the app — a bypass is
// data, not shame.
//
// Signing: requires the Family Controls capability. DEVELOPMENT builds work
// with the entitlement in App.entitlements alone; TestFlight/App Store waits on
// Apple approving the distribution request (FAMILY_CONTROLS_REQUEST.md).

import Foundation
import Capacitor
import SwiftUI
import FamilyControls
import ManagedSettings
import DeviceActivity

@objc(ScreenGuardPlugin)
public class ScreenGuardPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenGuardPlugin"
    public let jsName = "ScreenGuard"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentPicker", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shieldNow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "liftShield", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleWindow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelSchedule", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.com.ianpalsgaard.telemetry"
    static let selectionKey = "screenguard.selection"
    static let shieldFlagKey = "screenguard.shieldActive"
    static let scheduleFlagKey = "screenguard.scheduled"
    static let activityName = DeviceActivityName("telemetry.dangerWindow")
    // The SAME named store the TelemetryGuard extension writes — one shield.
    static let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("telemetryGuard"))

    private var defaults: UserDefaults { UserDefaults(suiteName: Self.appGroup) ?? .standard }

    private func loadSelection() -> FamilyActivitySelection? {
        guard let data = defaults.data(forKey: Self.selectionKey) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }
    private func saveSelection(_ sel: FamilyActivitySelection) {
        if let data = try? JSONEncoder().encode(sel) { defaults.set(data, forKey: Self.selectionKey) }
    }
    private func selectionCount(_ sel: FamilyActivitySelection?) -> Int {
        guard let sel = sel else { return 0 }
        return sel.applicationTokens.count + sel.categoryTokens.count + sel.webDomainTokens.count
    }

    @objc func status(_ call: CAPPluginCall) {
        let auth: String
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved: auth = "approved"
        case .denied: auth = "denied"
        default: auth = "notDetermined"
        }
        call.resolve([
            "available": true,
            "authorization": auth,
            "selectionCount": selectionCount(loadSelection()),
            "shieldActive": defaults.bool(forKey: Self.shieldFlagKey),
            "scheduled": defaults.bool(forKey: Self.scheduleFlagKey)
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(["authorization": "approved"])
            } catch {
                call.resolve(["authorization": "denied", "error": error.localizedDescription])
            }
        }
    }

    @objc func presentPicker(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let initial = self.loadSelection() ?? FamilyActivitySelection()
            let picker = GuardPickerView(selection: initial) { result in
                self.bridge?.viewController?.dismiss(animated: true)
                guard let sel = result else {
                    call.resolve(["saved": false, "selectionCount": self.selectionCount(self.loadSelection())])
                    return
                }
                self.saveSelection(sel)
                // A LIVE shield tracks an edited roster immediately.
                if self.defaults.bool(forKey: Self.shieldFlagKey) { self.applyShield(sel) }
                call.resolve(["saved": true, "selectionCount": self.selectionCount(sel)])
            }
            let host = UIHostingController(rootView: picker)
            self.bridge?.viewController?.present(host, animated: true)
        }
    }

    private func applyShield(_ sel: FamilyActivitySelection) {
        Self.store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
        Self.store.shield.applicationCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
        Self.store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
    }

    @objc func shieldNow(_ call: CAPPluginCall) {
        guard let sel = loadSelection(), selectionCount(sel) > 0 else {
            call.resolve(["ok": false, "reason": "no-selection"])
            return
        }
        applyShield(sel)
        defaults.set(true, forKey: Self.shieldFlagKey)
        call.resolve(["ok": true])
    }

    @objc func liftShield(_ call: CAPPluginCall) {
        Self.store.clearAllSettings()
        defaults.set(false, forKey: Self.shieldFlagKey)
        call.resolve(["ok": true])
    }

    // Danger-window schedule. The shield at the window's edges is applied by the
    // TelemetryGuard DeviceActivityMonitor extension — WITHOUT that Xcode target
    // built into the app, startMonitoring succeeds but nothing fires; status
    // still reports scheduled:true, so the JS layer surfaces the target as a
    // build prerequisite (DEVICE_VERIFICATION.md § ScreenGuard).
    @objc func scheduleWindow(_ call: CAPPluginCall) {
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: call.getInt("startHour") ?? 22, minute: call.getInt("startMinute") ?? 0),
            intervalEnd: DateComponents(hour: call.getInt("endHour") ?? 2, minute: call.getInt("endMinute") ?? 0),
            repeats: true
        )
        do {
            try DeviceActivityCenter().startMonitoring(Self.activityName, during: schedule)
            defaults.set(true, forKey: Self.scheduleFlagKey)
            call.resolve(["ok": true])
        } catch {
            call.resolve(["ok": false, "reason": error.localizedDescription])
        }
    }

    @objc func cancelSchedule(_ call: CAPPluginCall) {
        DeviceActivityCenter().stopMonitoring([Self.activityName])
        defaults.set(false, forKey: Self.scheduleFlagKey)
        call.resolve(["ok": true])
    }
}

// The system picker with sheet manners. The selection never leaves Apple's
// process as anything but tokens.
struct GuardPickerView: View {
    @State var selection: FamilyActivitySelection
    let done: (FamilyActivitySelection?) -> Void
    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Shielded apps")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { done(nil) } }
                    ToolbarItem(placement: .confirmationAction) { Button("Done") { done(selection) } }
                }
        }
    }
}
