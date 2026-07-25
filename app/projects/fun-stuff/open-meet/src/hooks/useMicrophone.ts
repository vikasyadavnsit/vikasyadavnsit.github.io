import { useCallback, useEffect, useRef } from 'react'
import { MediaManager } from '@/rtc/MediaManager'
import { useMediaStore } from '@/store/mediaStore'
import { useUIStore } from '@/store/uiStore'

export function useMicrophone(
  replaceAudioInPC?: (track: MediaStreamTrack) => void,
) {
  const {
    localStream,
    isMicOn,
    audioDevices,
    setIsMicOn,
    setSelectedMicId,
    setAudioDevices,
  } = useMediaStore()

  const addToast = useUIStore((s) => s.addToast)
  // Track the extra mic-only stream created during device switches so we can stop it
  const prevMicStreamRef = useRef<MediaStream | null>(null)

  const loadDevices = useCallback(async () => {
    const all = await MediaManager.enumerateDevices()
    setAudioDevices(
      all
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
          kind: d.kind,
        })),
    )
  }, [setAudioDevices])

  const toggle = useCallback(() => {
    if (!localStream) return
    const enabled = !isMicOn
    MediaManager.muteTrack(localStream, 'audio', !enabled)
    setIsMicOn(enabled)
  }, [localStream, isMicOn, setIsMicOn])

  const switchMic = useCallback(
    async (deviceId: string) => {
      setSelectedMicId(deviceId)
      if (!localStream) return

      try {
        // Get a new audio-only stream for the chosen device
        const newMicStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
          video: false,
        })
        const newAudioTrack = newMicStream.getAudioTracks()[0]

        // Replace in localStream so mute/unmute continues to work
        localStream.getAudioTracks().forEach((t) => {
          localStream.removeTrack(t)
          t.stop()
        })
        localStream.addTrack(newAudioTrack)

        // Replace in the peer connection if connected
        replaceAudioInPC?.(newAudioTrack)

        // Stop any previous switch stream reference
        MediaManager.stopStream(prevMicStreamRef.current)
        prevMicStreamRef.current = newMicStream

        await loadDevices()
      } catch {
        addToast('Failed to switch microphone', 'error')
      }
    },
    [localStream, replaceAudioInPC, setSelectedMicId, loadDevices, addToast],
  )

  useEffect(() => {
    return () => {
      MediaManager.stopStream(prevMicStreamRef.current)
    }
  }, [])

  return { isMicOn, audioDevices, toggle, switchMic, loadDevices }
}
