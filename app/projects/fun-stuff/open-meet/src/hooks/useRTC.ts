import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionManager } from '@/rtc/ConnectionManager'
import { createRoom, deleteRoom, getRoom } from '@/firebase/firestore'
import { useMeetingStore } from '@/store/meetingStore'
import { useParticipantsStore } from '@/store/participantsStore'
import { useUIStore } from '@/store/uiStore'
import { useDataChannel } from './useDataChannel'
import type { ConnectionStatus, DataChannelMessage, Participant } from '@/types'

export function useRTC(roomId: string, localStream: MediaStream | null) {
  const { localParticipantId, localName, setIsHost, setStatus } = useMeetingStore()
  const { add: addParticipant, remove: removeParticipant, clear: clearParticipants } = useParticipantsStore()
  const addToast = useUIStore((s) => s.addToast)

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('new')

  const connectionManagerRef = useRef<ConnectionManager | null>(null)
  const sendMessageRef = useRef<((msg: DataChannelMessage) => void) | undefined>(undefined)
  // Guard: ensure initConnection runs only once even if localStream identity changes
  const initializedRef = useRef(false)

  const { handleIncoming, sendMediaState, sendLeave } = useDataChannel(
    (msg) => sendMessageRef.current?.(msg),
  )

  const handleDataChannelMessage = useCallback(
    (msg: DataChannelMessage) => {
      if (msg.type === 'presence') {
        // Remove the stream-arrival stub (if present) before adding the real participant
        removeParticipant('__remote__')
        addParticipant(msg.payload.participant)
        return
      }
      handleIncoming(msg)
    },
    [handleIncoming, addParticipant, removeParticipant],
  )

  const initConnection = useCallback(
    async (stream: MediaStream) => {
      setStatus('joining')

      // Determine whether this client is the host, even after a browser refresh.
      // localParticipantId is persisted in sessionStorage, so it matches the
      // hostId stored in the room document from the original session.
      const roomDoc = await getRoom(roomId)
      const shouldBeHost = !roomDoc || roomDoc.hostId === localParticipantId

      if (!roomDoc) {
        await createRoom(roomId, localParticipantId)
      }
      setIsHost(shouldBeHost)

      const manager = new ConnectionManager(roomId, localParticipantId, {
        onConnectionStateChange: (status) => {
          setConnectionStatus(status)
          if (status === 'connected') {
            setStatus('connected')
            addToast('Connected!', 'success')
            const self: Participant = {
              id: localParticipantId,
              name: localName,
              isCameraOn: true,
              isMicOn: true,
              isSpeaking: false,
              isHandRaised: false,
            }
            manager.sendMessage({ type: 'presence', payload: { participant: self } })
            sendMediaState(localParticipantId, true, true)
          }
          if (status === 'failed') {
            setStatus('reconnecting')
          }
          if (status === 'disconnected') {
            setStatus('waiting')
          }
        },
        onReconnecting: () => {
          // Clear stale remote state so reconnect starts with a clean slate.
          // This prevents accumulating tiles from multiple reconnect cycles.
          clearParticipants()
          setRemoteStream(null)
          setStatus('waiting')
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream)
          // Add a stub so the participants panel shows the remote user immediately;
          // replaced by the real entry once the presence message arrives.
          addParticipant({
            id: '__remote__',
            name: 'Remote User',
            isCameraOn: true,
            isMicOn: true,
            isSpeaking: false,
            isHandRaised: false,
          })
        },
        onDataChannelMessage: handleDataChannelMessage,
      })

      sendMessageRef.current = (msg) => manager.sendMessage(msg)
      connectionManagerRef.current = manager

      await manager.join(stream, shouldBeHost)
      setStatus('waiting')
    },
    // roomId and localParticipantId are stable for the lifetime of a meeting
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, localParticipantId],
  )

  // Bug fix: localStream is null on initial render — the old `deps: []` effect ran
  // before the camera loaded and never retried. Now we watch localStream and
  // initialize exactly once when it becomes available.
  useEffect(() => {
    if (localStream && !initializedRef.current) {
      initializedRef.current = true
      initConnection(localStream)
    }
  }, [localStream, initConnection])

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      connectionManagerRef.current?.close(false)
    }
  }, [])

  const leave = useCallback(async () => {
    sendLeave(localParticipantId)
    const manager = connectionManagerRef.current
    connectionManagerRef.current = null
    sendMessageRef.current = undefined

    try {
      manager?.close(false)
      // Read isHost at call time to avoid stale closure
      if (useMeetingStore.getState().isHost) {
        await deleteRoom(roomId)
      }
    } catch {
      // ignore cleanup errors
    }

    setStatus('ended')
    setRemoteStream(null)
    setConnectionStatus('closed')
  }, [roomId, localParticipantId, sendLeave, setStatus])

  return {
    remoteStream,
    connectionStatus,
    sendMessage: (msg: DataChannelMessage) => sendMessageRef.current?.(msg),
    replaceVideoTrack: (track: MediaStreamTrack) =>
      connectionManagerRef.current?.replaceVideoTrack(track),
    replaceAudioTrack: (track: MediaStreamTrack) =>
      connectionManagerRef.current?.replaceAudioTrack(track),
    leave,
  }
}
