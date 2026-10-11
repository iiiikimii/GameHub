import { Wifi, WifiOff } from 'lucide-react'
import useOnlineStatus from '../hooks/useOnlineStatus.js'

export default function NetworkStatus() {
  const isOnline = useOnlineStatus()
  const Icon = isOnline ? Wifi : WifiOff

  return (
    <div
      className={`flex w-full items-center justify-center gap-1.5 border-b px-3 py-2 text-xs ${
        isOnline
          ? 'border-white/[0.06] bg-[#111323] text-white/40'
          : 'border-[#ef8b72]/30 bg-[#241713] text-[#ffb09c]'
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {isOnline ? 'Online' : 'Offline — layanan online tidak tersedia'}
    </div>
  )
}
