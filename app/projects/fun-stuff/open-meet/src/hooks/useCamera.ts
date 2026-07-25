import { useCallback, useEffect } from 'react'
import { MediaManager } from '@/rtc/MediaManager'
import { useMediaStore } from '@/store/mediaStore'
import { useUIStore } from '@/store/uiStore'

export function useCamera() {
  const {
    localStream,
    isCameraOn,
    isMirrored,
    selectedCameraId,
    selectedMicId,
    videoDevices,
    setLocalStream,
    setIsCameraOn,
    setIsMirrored,
    setSelectedCameraId,
    setVideoDevices,
  } = useMediaStore()
  const addToast = useUIStore((s) => s.addToast)

  const loadDevices = useCallback(async () => {
    const all = await MediaManager.enumerateDevices()
    setVideoDevices(
      all
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 6)}`,
          kind: d.kind,
        })),
    )
  }, [setVideoDevices])

  // Gets video + audio together so localStream carries both tracks for WebRTC.
  const start = useCallback(
    async (videoDeviceId?: string, audioDeviceId?: string) => {
      try {
        const stream = await MediaManager.getCamera(
          videoDeviceId ?? selectedCameraId ?? undefined,
          audioDeviceId ?? selectedMicId ?? undefined,
        )
        setLocalStream(stream)
        setIsCameraOn(true)
        await loadDevices()
        return stream
      } catch {
        addToast('Camera or microphone permission denied', 'error')
        setIsCameraOn(false)
        return null
      }
    },
    [selectedCameraId, selectedMicId, setLocalStream, setIsCameraOn, loadDevices, addToast],
  )

  const toggle = useCallback(() => {
    if (!localStream) return
    const enabled = !isCameraOn
    MediaManager.muteTrack(localStream, 'video', !enabled)
    setIsCameraOn(enabled)
  }, [localStream, isCameraOn, setIsCameraOn])

  const switchCamera = useCallback(
    async (videoDeviceId: string) => {
      setSelectedCameraId(videoDeviceId)
      // Preserve the current audio device when swapping camera
      const currentAudioDeviceId =
        localStream?.getAudioTracks()[0]?.getSettings().deviceId ?? selectedMicId ?? undefined
      MediaManager.stopStream(localStream)
      await start(videoDeviceId, currentAudioDeviceId)
    },
    [localStream, selectedMicId, start, setSelectedCameraId],
  )

  useEffect(() => {
    return () => {
      MediaManager.stopStream(localStream)
    }
  }, [localStream])

  return { localStream, isCameraOn, isMirrored, videoDevices, start, toggle, switchCamera, setIsMirrored }
}
