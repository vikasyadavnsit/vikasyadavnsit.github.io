import { useCallback, useRef } from 'react'
import { MediaManager } from '@/rtc/MediaManager'
import { useMediaStore } from '@/store/mediaStore'
import { useUIStore } from '@/store/uiStore'

export function useScreenShare(
  replacePCVideoTrack?: (track: MediaStreamTrack) => void,
) {
  const { localStream, screenStream, setScreenStream, setIsScreenSharing } = useMediaStore()
  const addToast = useUIStore((s) => s.addToast)
  const prevCameraTrackRef = useRef<MediaStreamTrack | null>(null)

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await MediaManager.getScreenShare()
      setScreenStream(screen)
      setIsScreenSharing(true)

      const screenVideoTrack = screen.getVideoTracks()[0]

      // Store the original camera track so we can restore it later
      if (localStream) {
        const camTrack = localStream.getVideoTracks()[0]
        prevCameraTrackRef.current = camTrack ?? null
      }

      // Hot-swap the video track on the peer connection
      if (replacePCVideoTrack && screenVideoTrack) {
        replacePCVideoTrack(screenVideoTrack)
      }

      // Auto-stop when user ends screen share via browser UI
      screenVideoTrack?.addEventListener('ended', () => {
        stopScreenShare()
      })
    } catch {
      addToast('Screen sharing cancelled or unavailable', 'warning')
    }
  }, [localStream, setScreenStream, setIsScreenSharing, replacePCVideoTrack, addToast])

  const stopScreenShare = useCallback(() => {
    MediaManager.stopStream(screenStream)
    setScreenStream(null)
    setIsScreenSharing(false)

    // Restore camera track on peer connection
    const camTrack = prevCameraTrackRef.current
    if (replacePCVideoTrack && camTrack) {
      replacePCVideoTrack(camTrack)
    }
    prevCameraTrackRef.current = null
  }, [screenStream, setScreenStream, setIsScreenSharing, replacePCVideoTrack])

  return { startScreenShare, stopScreenShare }
}
