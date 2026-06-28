import { useUIStore } from '@/store/uiStore'
import { useParticipants } from '@/hooks/useParticipants'

export function ParticipantsButton() {
  const { isParticipantsOpen, toggleParticipants } = useUIStore()
  const { count } = useParticipants()

  return (
    <div className="relative">
      <button
        onClick={toggleParticipants}
        className={`p-3 rounded-xl transition-all ${
          isParticipantsOpen
            ? 'bg-blue-500/30 text-blue-400'
            : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
        title="Participants"
      >
        👥
      </button>
      <span className="absolute -top-1 -right-1 bg-gray-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
        {count}
      </span>
    </div>
  )
}
