import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true
}

function getServerSnapshot() {
  return true
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-center text-xs font-medium text-black backdrop-blur-xs transition-all animate-in slide-in-from-top-2 shadow-xs"
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span>You are currently offline. Changes will sync once your connection is restored.</span>
    </div>
  )
}

