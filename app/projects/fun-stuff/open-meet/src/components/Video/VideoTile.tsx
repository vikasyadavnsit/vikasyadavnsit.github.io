import { useEffect, useRef, memo } from 'react'
import type { Participant } from '@/types'

interface VideoTileProps {
  participant: Participant
  stream: MediaStream | null
  isMirrored?: boolean
  isLocal?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const VideoTile = memo(function VideoTile({
  participant,
  stream,
  isMirrored = false,
  isLocal = false,
  size = 'md',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const initials = participant.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  }

  return (
    <div
      className={`relative bg-[#1e1e1e] rounded-2xl overflow-hidden flex items-center justify-center w-full h-full
        ${participant.isSpeaking ? 'speaking-ring' : 'ring-1 ring-white/5'}`}
    >
      {/* Video element */}
      {stream && participant.isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isMirrored ? 'video-mirror' : ''}`}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
          <div className={`font-semibold text-white/70 ${sizeClasses[size]}`}>
            {initials}
          </div>
        </div>
      )}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {participant.isHandRaised && <span className="text-sm">✋</span>}
          <span className="text-xs text-white truncate font-medium">
            {participant.name}{isLocal ? ' (You)' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!participant.isMicOn && (
            <span className="text-red-400 text-xs">🔇</span>
          )}
          {!participant.isCameraOn && (
            <span className="text-gray-400 text-xs">📷</span>
          )}
        </div>
      </div>

      {/* Speaking indicator ring */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-500 pointer-events-none animate-pulse" />
      )}
    </div>
  )
})
