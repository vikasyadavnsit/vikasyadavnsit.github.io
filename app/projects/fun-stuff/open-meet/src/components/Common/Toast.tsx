import { useUIStore } from '@/store/uiStore'
import type { Toast as ToastType } from '@/types'

const ICON: Record<ToastType['type'], string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
}

const BORDER: Record<ToastType['type'], string> = {
  info: 'border-blue-500/40',
  success: 'border-green-500/40',
  warning: 'border-yellow-500/40',
  error: 'border-red-500/40',
}

function ToastItem({ toast }: { toast: ToastType }) {
  const remove = useUIStore((s) => s.removeToast)
  return (
    <div
      className={`flex items-center gap-3 glass rounded-xl px-4 py-3 border ${BORDER[toast.type]} shadow-lg animate-in slide-in-from-right-5 duration-200 min-w-[280px] max-w-[380px]`}
    >
      <span className="text-lg shrink-0">{ICON[toast.type]}</span>
      <p className="text-sm text-gray-200 flex-1">{toast.message}</p>
      <button
        onClick={() => remove(toast.id)}
        className="text-gray-400 hover:text-white transition-colors shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
