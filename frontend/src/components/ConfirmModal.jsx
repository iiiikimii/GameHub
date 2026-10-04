import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

/**
 * Reusable confirmation modal for destructive actions.
 *
 * Props:
 *   open        — boolean
 *   title       — string
 *   message     — string or ReactNode
 *   confirmLabel — string (default "Confirm")
 *   danger      — boolean (red CTA)
 *   loading     — boolean
 *   onConfirm   — async function
 *   onCancel    — function
 */
export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null)

  // Focus cancel button when opened
  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm border border-white/10 bg-[#171b19] shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-white/[0.07] p-5">
          <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${danger ? 'bg-[#ef8b72]/10' : 'bg-[#c8f169]/10'}`}>
            <AlertTriangle className={`size-4 ${danger ? 'text-[#ef8b72]' : 'text-[#c8f169]'}`} aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">{title}</h2>
            {message && <p className="mt-1 text-sm text-white/50 leading-5">{message}</p>}
          </div>
          <button onClick={onCancel} className="shrink-0 text-white/25 transition hover:text-white/60" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-white/55 transition hover:border-white/20 hover:text-white/80 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50
              ${danger
                ? 'bg-[#ef8b72] text-[#1a0a06] hover:bg-[#f5a48c]'
                : 'bg-[#c8f169] text-[#172015] hover:bg-[#d7fa91]'
              }`}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
