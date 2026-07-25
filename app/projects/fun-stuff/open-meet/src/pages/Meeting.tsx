import { useEffect, useCallback, Suspense, lazy } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCamera } from '@/hooks/useCamera'
import { useMicrophone } from '@/hooks/useMicrophone'
import { useRTC } from '@/hooks/useRTC'
import { useDataChannel } from '@/hooks/useDataChannel'
import { useParticipants } from '@/hooks/useParticipants'
import { useMeetingStore } from '@/store/meetingStore'
import { useMediaStore } from '@/store/mediaStore'
import { useUIStore } from '@/store/uiStore'
import { VideoGrid } from '@/components/Video/VideoGrid'
import { ControlBar } from '@/components/Controls/ControlBar'
import { ToastContainer } from '@/components/Common/Toast'
import { EmojiReactionOverlay } from '@/components/Common/EmojiReaction'
import { Spinner } from '@/components/Common/Spinner'

const ChatPanel = lazy(() =>
  import('@/components/Chat/ChatPanel').then((m) => ({ default: m.ChatPanel })),
)
const ParticipantsPanel = lazy(() =>
  import('@/components/Participants/ParticipantsPanel').then((m) => ({ default: m.ParticipantsPanel })),
)

export function Meeting() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { setRoomId, status } = useMeetingStore()
  const { localStream, isCameraOn, isMicOn } = useMediaStore()
  const { isChatOpen, isParticipantsOpen } = useUIStore()

  const { start: startCamera } = useCamera()

  // Start camera + mic together — audio is included in the stream via getUserMedia
  useEffect(() => {
    const init = async () => {
      await startCamera()
      if (roomId) setRoomId(roomId)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync room ID into the parent window URL so the address bar shows the meeting
  // link and refresh lands back in the same room.
  useEffect(() => {
    if (!roomId) return
    try {
      const target = window.self !== window.top ? window.parent : window
      const url = new URL(target.location.href)
      url.searchParams.set('room', roomId)
      target.history.replaceState(null, '', url.toString())
    } catch { /* cross-origin — ignore */ }

    return () => {
      try {
        const target = window.self !== window.top ? window.parent : window
        const url = new URL(target.location.href)
        url.searchParams.delete('room')
        target.history.replaceState(null, '', url.toString())
      } catch { /* cross-origin */ }
    }
  }, [roomId])

  const {
    remoteStream,
    sendMessage,
    replaceVideoTrack,
    replaceAudioTrack,
    leave,
  } = useRTC(roomId ?? '', localStream)

  // Wire mic switcher to the peer connection so switching device replaces the sender track
  const { toggle: toggleMic } = useMicrophone(replaceAudioTrack)

  const { sendChat, sendMediaState, sendLeave } = useDataChannel(sendMessage)

  const { localParticipant, remoteParticipants } = useParticipants()

  const handleLeave = useCallback(async () => {
    sendLeave(localParticipant.id)
    await leave()
    navigate('/')
  }, [leave, navigate, sendLeave, localParticipant.id])

  // Broadcast media state changes
  useEffect(() => {
    sendMediaState(localParticipant.id, isCameraOn, isMicOn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOn, isMicOn])

  // Suppress unused warning — toggleMic is used by MicButton via the store/hook
  void toggleMic

  const isPanelOpen = isChatOpen || isParticipantsOpen

  return (
    <div className="h-screen w-screen bg-[#0f0f0f] overflow-hidden flex flex-col">
      {/* Status bar */}
      {(status === 'joining' || status === 'waiting') && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 glass rounded-full px-4 py-2 flex items-center gap-2 text-sm text-gray-300 border border-white/10">
          <Spinner size={16} />
          <span>{status === 'joining' ? 'Joining meeting…' : 'Waiting for others…'}</span>
        </div>
      )}

      {/* Room ID badge */}
      <div className="absolute top-4 left-4 z-20 glass rounded-full px-3 py-1.5 text-xs text-gray-400 border border-white/10 font-mono">
        {roomId}
      </div>

      {/* Main video area */}
      <div className={`flex-1 transition-all duration-300 ${isPanelOpen ? 'mr-80' : ''}`}>
        <VideoGrid
          localParticipant={localParticipant}
          remoteParticipants={remoteParticipants}
          remoteStream={remoteStream}
        />
      </div>

      {/* Control bar */}
      <ControlBar
        onLeave={handleLeave}
        sendMessage={sendMessage}
        replaceVideoTrack={replaceVideoTrack}
      />

      {/* Side panels */}
      <Suspense fallback={null}>
        {isChatOpen && <ChatPanel onSendChat={sendChat} />}
        {isParticipantsOpen && <ParticipantsPanel />}
      </Suspense>

      <EmojiReactionOverlay />
      <ToastContainer />
    </div>
  )
}
