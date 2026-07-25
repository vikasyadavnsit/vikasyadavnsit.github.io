import { useState, useEffect, useRef, useCallback } from 'react'

export type Permission = 'pending' | 'granted' | 'denied'

export interface UseWebcamReturn {
  permission: Permission
  retry: () => void
  mirrored: boolean
  setMirrored: React.Dispatch<React.SetStateAction<boolean>>
  isFullscreen: boolean
  toggleFullscreen: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useWebcam(): UseWebcamReturn {
  const [permission, setPermission] = useState<Permission>('pending')
  const [retryCount, setRetryCount] = useState(0)
  const [mirrored, setMirrored] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    async function requestCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        setPermission('granted')
      } catch {
        setPermission('denied')
      }
    }

    setPermission('pending')
    requestCamera()

    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [retryCount])

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenEnabled) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await containerRef.current?.requestFullscreen()
      }
    } catch {
      // fullscreen blocked (e.g. iOS Safari) — silently ignore
    }
  }, [])

  return { permission, retry, mirrored, setMirrored, isFullscreen, toggleFullscreen, containerRef }
}
