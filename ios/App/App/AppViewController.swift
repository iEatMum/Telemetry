// AppViewController.swift — the bridge controller Main.storyboard instantiates.
// Exists for ONE reason: Capacitor ≥5 has no automatic discovery of app-local
// plugins, so ScreenGuard registers here (the documented custom-code path).

import UIKit
import Capacitor

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ScreenGuardPlugin())
    }
}
