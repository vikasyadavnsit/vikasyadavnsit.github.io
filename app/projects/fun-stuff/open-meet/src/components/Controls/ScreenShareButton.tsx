import { useScreenShare } from '@/hooks/useScreenShare'
import { useMediaStore } from '@/store/mediaStore'

interface ScreenShareButtonProps {
  replaceVideoTrack?: (track: MediaStreamTrack) => void
}

export function ScreenShareButton({ replaceVideoTrack }: ScreenShareButtonProps) {
  const isScreenSharing = useMediaStore((s) => s.isScreenSharing)
  const { startScreenShare, stopScreenShare } = useScreenShare(replaceVideoTrack)

  const handleClick = () => {
    if (isScreenSharing) {
      stopScreenShare()
    } else {
      startScreenShare()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`p-3 rounded-xl transition-all ${
        isScreenSharing
          ? 'bg-blue-500 hover:bg-blue-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white'
      }`}
      title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
    >
      🖥️
    </button>
  )
}
