import { memo } from 'react'
import { MicButton } from './MicButton'
import { CameraButton } from './CameraButton'
import { ScreenShareButton } from './ScreenShareButton'
import { ChatButton } from './ChatButton'
import { ParticipantsButton } from './ParticipantsButton'
import { HandRaiseButton } from './HandRaiseButton'
import { EmojiReactionButton } from './EmojiReactionButton'
import { LeaveButton } from './LeaveButton'
import type { DataChannelMessage } from '@/types'

interface ControlBarProps {
  onLeave: () => void
  sendMessage: (msg: DataChannelMessage) => void
  replaceVideoTrack?: (track: MediaStreamTrack) => void
}

export const ControlBar = memo(function ControlBar({ onLeave, sendMessage, replaceVideoTrack }: ControlBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2 shadow-2xl border border-white/10">
        <MicButton sendMessage={sendMessage} />
        <CameraButton />
        <ScreenShareButton replaceVideoTrack={replaceVideoTrack} />

        <div className="w-px h-8 bg-white/10 mx-1" />

        <ChatButton />
        <ParticipantsButton />
        <HandRaiseButton sendMessage={sendMessage} />
        <EmojiReactionButton sendMessage={sendMessage} />

        <div className="w-px h-8 bg-white/10 mx-1" />

        <LeaveButton onLeave={onLeave} />
      </div>
    </div>
  )
})
