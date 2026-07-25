import { useState } from 'react'
import { useMeetingStore } from '@/store/meetingStore'
import type { DataChannelMessage } from '@/types'

interface HandRaiseButtonProps {
  sendMessage: (msg: DataChannelMessage) => void
}

export function HandRaiseButton({ sendMessage }: HandRaiseButtonProps) {
  const [isRaised, setIsRaised] = useState(false)
  const localParticipantId = useMeetingStore((s) => s.localParticipantId)

  const toggle = () => {
    const next = !isRaised
    setIsRaised(next)
    sendMessage({ type: 'handRaise', payload: { senderId: localParticipantId, isRaised: next } })
  }

  return (
    <button
      onClick={toggle}
      className={`p-3 rounded-xl transition-all ${
        isRaised ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
      }`}
      title={isRaised ? 'Lower hand' : 'Raise hand'}
    >
      ✋
    </button>
  )
}
