// Sheet.jsx — a bottom sheet / modal shell. Tap the backdrop to close.
// Shared by the reset journal and the settings sheet.

export default function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative mx-auto max-h-[90vh] w-full max-w-app overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-5 pb-safe">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}
