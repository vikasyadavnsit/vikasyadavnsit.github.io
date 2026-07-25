import { useState } from 'react'
import { useMeetingStore } from '@/store/meetingStore'
import { useUIStore } from '@/store/uiStore'
import type { DataChannelMessage, EmojiReaction } from '@/types'

const EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🎉', '🔥', '💯']

interface EmojiReactionButtonProps {
  sendMessage: (msg: DataChannelMessage) => void
}

export function EmojiReactionButton({ sendMessage }: EmojiReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const { localParticipantId, localName } = useMeetingStore()
  const addReaction = useUIStore((s) => s.addReaction)

  const react = (emoji: string) => {
    setShowPicker(false)
    sendMessage({ type: 'reaction', payload: { senderId: localParticipantId, emoji } })
    const reaction: EmojiReaction = {
      id: Math.random().toString(36).slice(2),
      senderId: localParticipantId,
      senderName: localName,
      emoji,
      timestamp: Date.now(),
    }
    addReaction(reaction)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker((v) => !v)}
        className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
        title="Send reaction"
      >
        😊
      </button>
      {showPicker && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass rounded-2xl p-3 shadow-xl border border-white/10">
          <div className="grid grid-cols-4 gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => react(e)}
                className="text-2xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
