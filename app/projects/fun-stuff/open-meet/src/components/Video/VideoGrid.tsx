import { memo } from 'react'
import { VideoTile } from './VideoTile'
import { useMediaStore } from '@/store/mediaStore'
import type { Participant } from '@/types'

interface VideoGridProps {
  localParticipant: Participant
  remoteParticipants: Participant[]
  remoteStream: MediaStream | null
}

export const VideoGrid = memo(function VideoGrid({
  localParticipant,
  remoteParticipants,
  remoteStream,
}: VideoGridProps) {
  const { localStream, screenStream, isScreenSharing, isMirrored } = useMediaStore()

  const totalCount = 1 + remoteParticipants.length

  const gridClass = (() => {
    if (totalCount === 1) return 'grid-cols-1 grid-rows-1'
    if (totalCount === 2) return 'grid-cols-2 grid-rows-1'
    if (totalCount <= 4) return 'grid-cols-2 grid-rows-2'
    if (totalCount <= 6) return 'grid-cols-3 grid-rows-2'
    return 'grid-cols-3 grid-rows-3'
  })()

  const displayStream = isScreenSharing && screenStream ? screenStream : localStream

  return (
    <div className={`grid gap-2 w-full h-full p-2 ${gridClass}`}>
      <VideoTile
        participant={localParticipant}
        stream={displayStream}
        isMirrored={isMirrored && !isScreenSharing}
        isLocal
        size={totalCount === 1 ? 'lg' : totalCount <= 2 ? 'md' : 'sm'}
      />
      {remoteParticipants.map((p) => (
        <VideoTile
          key={p.id}
          participant={p}
          stream={p.id === remoteParticipants[0]?.id ? remoteStream : null}
          size={totalCount <= 2 ? 'md' : 'sm'}
        />
      ))}
    </div>
  )
})
