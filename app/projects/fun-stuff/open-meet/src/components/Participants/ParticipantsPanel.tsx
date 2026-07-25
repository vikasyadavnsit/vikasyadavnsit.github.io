import { memo } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useParticipants } from '@/hooks/useParticipants'
import { useMediaStore } from '@/store/mediaStore'

export const ParticipantsPanel = memo(function ParticipantsPanel() {
  const isParticipantsOpen = useUIStore((s) => s.isParticipantsOpen)
  const { localParticipant, remoteParticipants, count } = useParticipants()
  const { isCameraOn, isMicOn } = useMediaStore()

  const allParticipants = [
    { ...localParticipant, isCameraOn, isMicOn },
    ...remoteParticipants,
  ]

  return (
    <div
      className={`fixed right-0 top-0 bottom-0 w-72 glass-dark border-l border-white/10 flex flex-col z-20 transition-transform duration-300 ${
        isParticipantsOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 shrink-0">
        <h2 className="text-sm font-semibold text-white">Participants ({count})</h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {allParticipants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {p.name}
                {p.id === localParticipant.id && (
                  <span className="text-gray-400 text-xs ml-1">(you)</span>
                )}
              </p>
              {p.isSpeaking && (
                <p className="text-xs text-green-400">Speaking…</p>
              )}
            </div>

            {/* Status icons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {p.isHandRaised && <span title="Hand raised" className="text-sm">✋</span>}
              <span
                className={`text-sm ${p.isMicOn ? 'text-gray-400' : 'text-red-400'}`}
                title={p.isMicOn ? 'Mic on' : 'Muted'}
              >
                {p.isMicOn ? '🎙️' : '🔇'}
              </span>
              <span
                className={`text-sm ${p.isCameraOn ? 'text-gray-400' : 'text-red-400'}`}
                title={p.isCameraOn ? 'Camera on' : 'Camera off'}
              >
                {p.isCameraOn ? '📷' : '🚫'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
