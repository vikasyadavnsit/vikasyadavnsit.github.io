import { useState } from 'react'
import { useMicrophone } from '@/hooks/useMicrophone'
import { useMediaStore } from '@/store/mediaStore'
import { useMeetingStore } from '@/store/meetingStore'
import { DeviceSelector } from '@/components/Common/DeviceSelector'
import type { DataChannelMessage } from '@/types'

interface MicButtonProps {
  sendMessage: (msg: DataChannelMessage) => void
}

export function MicButton({ sendMessage }: MicButtonProps) {
  const { isMicOn, audioDevices, toggle, switchMic } = useMicrophone()
  const selectedMicId = useMediaStore((s) => s.selectedMicId)
  const localParticipantId = useMeetingStore((s) => s.localParticipantId)
  const isCameraOn = useMediaStore((s) => s.isCameraOn)
  const [showSelector, setShowSelector] = useState(false)

  const handleToggle = () => {
    toggle()
    sendMessage({
      type: 'mediaState',
      payload: { senderId: localParticipantId, isCameraOn, isMicOn: !isMicOn },
    })
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <button
          onClick={handleToggle}
          className={`p-3 rounded-xl transition-all ${
            isMicOn
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? '🎙️' : '🔇'}
        </button>
        <button
          onClick={() => setShowSelector((v) => !v)}
          className="ml-0.5 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs"
          title="Select microphone"
        >
          ▲
        </button>
      </div>
      {showSelector && (
        <div className="absolute bottom-full mb-2 left-0">
          <DeviceSelector
            devices={audioDevices}
            selectedId={selectedMicId}
            onSelect={switchMic}
            onClose={() => setShowSelector(false)}
          />
        </div>
      )}
    </div>
  )
}
