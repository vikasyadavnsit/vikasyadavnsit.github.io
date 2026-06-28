import { useUIStore } from '@/store/uiStore'

export function EmojiReactionOverlay() {
  const reactions = useUIStore((s) => s.reactions)

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-24 animate-bounce"
          style={{
            left: `${15 + Math.abs(r.id.charCodeAt(0) - 97) * 3}%`,
            animationDuration: '0.6s',
          }}
        >
          <div className="flex flex-col items-center">
            <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
            <span className="text-xs text-white/70 mt-1 glass rounded-full px-2 py-0.5">
              {r.senderName}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
