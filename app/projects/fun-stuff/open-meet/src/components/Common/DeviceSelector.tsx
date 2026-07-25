import type { DeviceInfo } from '@/types'

interface DeviceSelectorProps {
  devices: DeviceInfo[]
  selectedId: string | null
  onSelect: (deviceId: string) => void
  onClose: () => void
}

export function DeviceSelector({ devices, selectedId, onSelect, onClose }: DeviceSelectorProps) {
  if (devices.length === 0) {
    return (
      <div className="glass rounded-xl p-3 shadow-xl border border-white/10 min-w-[200px]">
        <p className="text-xs text-gray-400 text-center">No devices found</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl shadow-xl border border-white/10 overflow-hidden min-w-[220px]">
      {devices.map((d) => (
        <button
          key={d.deviceId}
          onClick={() => { onSelect(d.deviceId); onClose() }}
          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center gap-2
            ${selectedId === d.deviceId ? 'text-blue-400' : 'text-gray-200'}`}
        >
          {selectedId === d.deviceId && <span className="text-blue-400">✓</span>}
          <span className="truncate">{d.label}</span>
        </button>
      ))}
    </div>
  )
}
