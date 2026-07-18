# TelemetryGuard — DeviceActivity monitor extension (staged)

Xcode step (like the widget target): File → New → Target → **Device Activity
Monitor Extension** → name `TelemetryGuard`, bundle id
`com.ianpalsgaard.telemetry.monitor` (matches FAMILY_CONTROLS_REQUEST.md).
Replace the template monitor with `GuardMonitor.swift`, set this folder's
`TelemetryGuard.entitlements` on the target, and add the **Family Controls**
capability + App Group `group.com.ianpalsgaard.telemetry`.

Without this target, "Shield now" / "Lift" still work (the app applies the
shield directly); only the automatic danger-window schedule needs it.
